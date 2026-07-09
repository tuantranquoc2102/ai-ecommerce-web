import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdminListReviewsQuery,
  ModerateReviewDto,
  PaginatedReviews,
  ReplyReviewDto,
  ReviewStatus,
  ReviewView,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

const REVIEW_INCLUDE = {
  product: { select: { id: true, slug: true, title: true, mainImage: true } },
  user: { select: { firstName: true, lastName: true, email: true } },
} satisfies Prisma.ReviewInclude;

type ReviewWithRelations = Prisma.ReviewGetPayload<{ include: typeof REVIEW_INCLUDE }>;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminListReviewsQuery): Promise<PaginatedReviews> {
    const where: Prisma.ReviewWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { content: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: REVIEW_INCLUDE,
        orderBy: { [query.sortBy]: query.sortDir },
        skip,
        take: query.pageSize,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: rows.map(toReviewView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string): Promise<ReviewView> {
    return toReviewView(await this.getReviewOrThrow(id));
  }

  async moderate(id: string, dto: ModerateReviewDto): Promise<ReviewView> {
    await this.getReviewOrThrow(id);
    const review = await this.prisma.review.update({
      where: { id },
      data: { status: dto.status },
      include: REVIEW_INCLUDE,
    });
    return toReviewView(review);
  }

  async reply(id: string, dto: ReplyReviewDto, repliedByUserId: string): Promise<ReviewView> {
    await this.getReviewOrThrow(id);
    const review = await this.prisma.review.update({
      where: { id },
      data: {
        reply: dto.reply,
        repliedAt: new Date(),
        repliedByUserId,
      },
      include: REVIEW_INCLUDE,
    });
    return toReviewView(review);
  }

  async delete(id: string): Promise<void> {
    await this.getReviewOrThrow(id);
    await this.prisma.review.delete({ where: { id } });
  }

  private async getReviewOrThrow(id: string): Promise<ReviewWithRelations> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: REVIEW_INCLUDE,
    });
    if (!review) {
      throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Review not found' });
    }
    return review;
  }
}

function toReviewView(r: ReviewWithRelations): ReviewView {
  const fullName = r.user
    ? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ').trim()
    : '';
  const customerName = r.user ? (fullName || r.user.email || null) : null;

  return {
    id: r.id,
    productId: r.productId,
    product: r.product
      ? {
          id: r.product.id,
          slug: r.product.slug,
          title: r.product.title,
          mainImage: r.product.mainImage,
        }
      : null,
    userId: r.userId,
    customerName,
    orderId: r.orderId,
    isVerifiedPurchase: r.orderId != null,
    rating: r.rating,
    title: r.title,
    content: r.content,
    status: r.status as ReviewStatus,
    reply: r.reply,
    repliedAt: r.repliedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
