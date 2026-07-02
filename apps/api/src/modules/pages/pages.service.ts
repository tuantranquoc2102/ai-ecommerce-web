import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreatePageDto, ListPagesQuery, UpdatePageDto } from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toSlug } from '../../common/slug';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPagesQuery) {
    const where: Prisma.PageWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.page.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.page.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', message: 'Page not found' });
    return page;
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', message: 'Page not found' });
    return page;
  }

  async create(input: CreatePageDto) {
    const slug = input.slug ?? toSlug(input.title);
    const exists = await this.prisma.page.findUnique({ where: { slug } });
    if (exists) {
      throw new ConflictException({ code: 'PAGE_EXISTS', message: 'Slug already in use' });
    }
    return this.prisma.page.create({
      data: {
        title: input.title,
        slug,
        layoutJson: input.layoutJson as Prisma.InputJsonValue,
        seoTitle: input.seoTitle ?? null,
        seoDesc: input.seoDesc ?? null,
        status: input.status,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      },
    });
  }

  async update(id: string, input: UpdatePageDto) {
    const current = await this.findById(id);
    const nextSlug = input.slug ?? (input.title ? toSlug(input.title) : current.slug);

    if (nextSlug !== current.slug) {
      const conflict = await this.prisma.page.findFirst({
        where: { AND: [{ id: { not: id } }, { slug: nextSlug }] },
      });
      if (conflict) {
        throw new ConflictException({ code: 'PAGE_EXISTS', message: 'Slug already in use' });
      }
    }

    // publishedAt lifecycle:
    //   DRAFT/SCHEDULED → PUBLISHED : stamp now
    //   PUBLISHED → anything else   : keep the original publishedAt for audit
    const nextStatus = input.status ?? current.status;
    const nextPublishedAt =
      nextStatus === 'PUBLISHED' && current.status !== 'PUBLISHED'
        ? new Date()
        : current.publishedAt;

    return this.prisma.page.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        slug: nextSlug,
        layoutJson:
          input.layoutJson === undefined
            ? undefined
            : (input.layoutJson as Prisma.InputJsonValue),
        seoTitle: input.seoTitle === undefined ? undefined : input.seoTitle,
        seoDesc: input.seoDesc === undefined ? undefined : input.seoDesc,
        status: input.status ?? undefined,
        publishedAt: nextPublishedAt,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.page.delete({ where: { id } });
  }
}
