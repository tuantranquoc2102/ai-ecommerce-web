import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTagDto, ListTagsQuery, UpdateTagDto } from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toSlug } from '../../common/slug';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTagsQuery) {
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { slug: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tag.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: query.pageSize,
        include: { _count: { select: { productTags: true } } },
      }),
      this.prisma.tag.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { productTags: true } } },
    });
    if (!tag) throw new NotFoundException({ code: 'TAG_NOT_FOUND', message: 'Tag not found' });
    return tag;
  }

  async create(input: CreateTagDto) {
    const slug = input.slug ?? toSlug(input.name);
    const exists = await this.prisma.tag.findFirst({
      where: { OR: [{ name: input.name }, { slug }] },
    });
    if (exists) {
      throw new ConflictException({ code: 'TAG_EXISTS', message: 'Tag name or slug already exists' });
    }
    return this.prisma.tag.create({ data: { name: input.name, slug } });
  }

  async update(id: string, input: UpdateTagDto) {
    const current = await this.findById(id);
    const nextName = input.name ?? current.name;
    const nextSlug = input.slug ?? (input.name ? toSlug(input.name) : current.slug);

    if (nextName !== current.name || nextSlug !== current.slug) {
      const conflict = await this.prisma.tag.findFirst({
        where: {
          AND: [{ id: { not: id } }, { OR: [{ name: nextName }, { slug: nextSlug }] }],
        },
      });
      if (conflict) {
        throw new ConflictException({ code: 'TAG_EXISTS', message: 'Tag name or slug already exists' });
      }
    }

    return this.prisma.tag.update({
      where: { id },
      data: { name: nextName, slug: nextSlug },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.tag.delete({ where: { id } });
  }
}
