import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ActivePromotionInfo,
  CreatePromotionDto,
  ListPromotionsQuery,
  PromotionDiscountType,
  PromotionView,
  UpdatePromotionDto,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

type PromotionRow = Prisma.PromotionGetPayload<{
  include: { products: { select: { productId: true } } };
}>;

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPromotionsQuery) {
    const where: Prisma.PromotionWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.active !== undefined ? { isActive: query.active } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.promotion.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: query.pageSize,
        include: { products: { select: { productId: true } } },
      }),
      this.prisma.promotion.count({ where }),
    ]);
    return {
      items: items.map((p) => this.toView(p)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string): Promise<PromotionView> {
    const row = await this.prisma.promotion.findUnique({
      where: { id },
      include: { products: { select: { productId: true } } },
    });
    if (!row) {
      throw new NotFoundException({ code: 'PROMOTION_NOT_FOUND', message: 'Promotion not found' });
    }
    return this.toView(row);
  }

  async create(input: CreatePromotionDto): Promise<PromotionView> {
    await this.assertProductsExist(input.productIds);
    if (input.code) {
      const exists = await this.prisma.promotion.findUnique({ where: { code: input.code } });
      if (exists) {
        throw new ConflictException({ code: 'PROMOTION_CODE_EXISTS', message: 'Promotion code already exists' });
      }
    }

    const row = await this.prisma.promotion.create({
      data: {
        name: input.name,
        code: input.code ?? null,
        description: input.description ?? null,
        kind: input.kind,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxDiscount: input.maxDiscount ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        isActive: input.isActive,
        priority: input.priority,
        appliesToAllProducts: input.appliesToAllProducts,
        products:
          input.appliesToAllProducts || input.productIds.length === 0
            ? undefined
            : {
                createMany: {
                  data: Array.from(new Set(input.productIds)).map((productId) => ({ productId })),
                  skipDuplicates: true,
                },
              },
      },
      include: { products: { select: { productId: true } } },
    });

    return this.toView(row);
  }

  async update(id: string, input: UpdatePromotionDto): Promise<PromotionView> {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'PROMOTION_NOT_FOUND', message: 'Promotion not found' });
    }

    if (input.code && input.code !== existing.code) {
      const used = await this.prisma.promotion.findUnique({ where: { code: input.code } });
      if (used) {
        throw new ConflictException({ code: 'PROMOTION_CODE_EXISTS', message: 'Promotion code already exists' });
      }
    }

    if (input.productIds) {
      await this.assertProductsExist(input.productIds);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.promotion.update({
        where: { id },
        data: {
          name: input.name ?? undefined,
          code: input.code === undefined ? undefined : input.code,
          description: input.description === undefined ? undefined : input.description,
          kind: input.kind ?? undefined,
          discountType: input.discountType ?? undefined,
          discountValue: input.discountValue ?? undefined,
          maxDiscount: input.maxDiscount === undefined ? undefined : input.maxDiscount,
          startsAt: input.startsAt === undefined ? undefined : input.startsAt,
          endsAt: input.endsAt === undefined ? undefined : input.endsAt,
          isActive: input.isActive ?? undefined,
          priority: input.priority ?? undefined,
          appliesToAllProducts: input.appliesToAllProducts ?? undefined,
        },
      });

      const replaceProducts =
        input.productIds !== undefined ||
        input.appliesToAllProducts !== undefined;
      if (replaceProducts) {
        const appliesAll = input.appliesToAllProducts ?? existing.appliesToAllProducts;
        await tx.promotionProduct.deleteMany({ where: { promotionId: id } });
        if (!appliesAll) {
          const productIds = Array.from(new Set(input.productIds ?? []));
          if (productIds.length === 0) {
            throw new BadRequestException({
              code: 'PROMOTION_PRODUCTS_REQUIRED',
              message: 'Choose at least one product or set appliesToAllProducts=true',
            });
          }
          await tx.promotionProduct.createMany({
            data: productIds.map((productId) => ({ promotionId: id, productId })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'PROMOTION_NOT_FOUND', message: 'Promotion not found' });
    }
    await this.prisma.promotion.delete({ where: { id } });
  }

  async resolveBestForProducts(
    client: DbClient,
    lines: Array<{ productId: string; amount: Prisma.Decimal }>,
    at = new Date(),
  ): Promise<Map<string, ActivePromotionInfo>> {
    const uniqueProductIds = Array.from(new Set(lines.map((l) => l.productId)));
    if (uniqueProductIds.length === 0) return new Map();

    const rows = await client.promotion.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: at } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: at } }] },
        ],
        OR: [
          { appliesToAllProducts: true },
          { products: { some: { productId: { in: uniqueProductIds } } } },
        ],
      },
      include: {
        products: {
          where: { productId: { in: uniqueProductIds } },
          select: { productId: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const best = new Map<string, ActivePromotionInfo>();
    for (const line of lines) {
      const applicable = rows.filter(
        (p) => p.appliesToAllProducts || p.products.some((pp) => pp.productId === line.productId),
      );
      let winner: ActivePromotionInfo | null = null;
      for (const p of applicable) {
        const finalPrice = applyPromotion(line.amount, p).toString();
        const candidate: ActivePromotionInfo = {
          id: p.id,
          name: p.name,
          kind: p.kind,
          discountType: p.discountType as PromotionDiscountType,
          discountValue: p.discountValue.toString(),
          finalPrice,
        };
        if (!winner) {
          winner = candidate;
          continue;
        }
        if (new Prisma.Decimal(candidate.finalPrice).lt(winner.finalPrice)) {
          winner = candidate;
        }
      }
      if (winner && new Prisma.Decimal(winner.finalPrice).lt(line.amount)) {
        best.set(line.productId, winner);
      }
    }

    return best;
  }

  private async assertProductsExist(productIds: string[]): Promise<void> {
    const unique = Array.from(new Set(productIds));
    if (unique.length === 0) return;
    const found = await this.prisma.product.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException({
        code: 'UNKNOWN_PRODUCT',
        message: 'One or more productIds do not exist',
      });
    }
  }

  private toView(row: PromotionRow): PromotionView {
    return {
      id: row.id,
      name: row.name,
      code: row.code ?? null,
      description: row.description ?? null,
      kind: row.kind,
      discountType: row.discountType,
      discountValue: row.discountValue.toString(),
      maxDiscount: row.maxDiscount?.toString() ?? null,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      isActive: row.isActive,
      priority: row.priority,
      appliesToAllProducts: row.appliesToAllProducts,
      productIds: row.products.map((p) => p.productId),
      productCount: row.appliesToAllProducts ? -1 : row.products.length,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function applyPromotion(baseAmount: Prisma.Decimal, promotion: PromotionRow): Prisma.Decimal {
  const zero = new Prisma.Decimal(0);
  if (promotion.discountType === 'SET_PRICE') {
    return Prisma.Decimal.min(baseAmount, promotion.discountValue);
  }

  if (promotion.discountType === 'FIXED_AMOUNT') {
    const next = baseAmount.minus(promotion.discountValue);
    return next.greaterThan(zero) ? next : zero;
  }

  const pct = baseAmount.mul(promotion.discountValue).div(100);
  const discount = promotion.maxDiscount ? Prisma.Decimal.min(pct, promotion.maxDiscount) : pct;
  const next = baseAmount.minus(discount);
  return next.greaterThan(zero) ? next : zero;
}
