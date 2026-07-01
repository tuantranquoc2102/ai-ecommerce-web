import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CategoryTreeNode,
  CreateCategoryDto,
  ListCategoriesQuery,
  UpdateCategoryDto,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toSlug } from '../../common/slug';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCategoriesQuery) {
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { slug: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    return this.prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { productCategories: true, children: true } } },
    });
  }

  /**
   * Returns a nested tree of root categories (parentId=null) with `children`
   * recursively hydrated. Single query, in-memory assembly — cheap for admin
   * navigation where the category count is small.
   */
  async tree(): Promise<CategoryTreeNode[]> {
    const all = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { productCategories: true } } },
    });

    const byId = new Map<string, CategoryTreeNode>();
    for (const c of all) {
      byId.set(c.id, {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        parentId: c.parentId,
        sortOrder: c.sortOrder,
        productCount: c._count.productCategories,
        children: [],
      });
    }
    const roots: CategoryTreeNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { productCategories: true, children: true } } },
    });
    if (!category) {
      throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
    }
    return category;
  }

  async create(input: CreateCategoryDto) {
    const slug = input.slug ?? toSlug(input.name);
    const exists = await this.prisma.category.findFirst({ where: { slug } });
    if (exists) {
      throw new ConflictException({ code: 'CATEGORY_EXISTS', message: 'Slug already in use' });
    }
    if (input.parentId) await this.assertParentExists(input.parentId);
    return this.prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, input: UpdateCategoryDto) {
    const current = await this.findById(id);
    const nextSlug = input.slug ?? (input.name ? toSlug(input.name) : current.slug);

    if (nextSlug !== current.slug) {
      const conflict = await this.prisma.category.findFirst({
        where: { AND: [{ id: { not: id } }, { slug: nextSlug }] },
      });
      if (conflict) {
        throw new ConflictException({ code: 'CATEGORY_EXISTS', message: 'Slug already in use' });
      }
    }

    if (input.parentId !== undefined && input.parentId !== current.parentId) {
      if (input.parentId === id) {
        throw new BadRequestException({
          code: 'INVALID_PARENT',
          message: 'A category cannot be its own parent',
        });
      }
      if (input.parentId) {
        await this.assertParentExists(input.parentId);
        await this.assertNotDescendant(id, input.parentId);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: input.name ?? current.name,
        slug: nextSlug,
        description: input.description === undefined ? undefined : input.description,
        imageUrl: input.imageUrl === undefined ? undefined : input.imageUrl,
        parentId: input.parentId === undefined ? undefined : input.parentId,
        sortOrder: input.sortOrder === undefined ? undefined : input.sortOrder,
      },
    });
  }

  async delete(id: string) {
    const category = await this.findById(id);
    if (category._count.children > 0) {
      throw new BadRequestException({
        code: 'CATEGORY_HAS_CHILDREN',
        message: 'Delete or reparent child categories first',
      });
    }
    await this.prisma.category.delete({ where: { id } });
  }

  private async assertParentExists(parentId: string) {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true },
    });
    if (!parent) {
      throw new BadRequestException({
        code: 'INVALID_PARENT',
        message: 'Parent category does not exist',
      });
    }
  }

  /**
   * Prevent cycles: refuse to move `id` under `newParentId` if `newParentId`
   * is itself a descendant of `id`. Walk up from `newParentId`.
   */
  private async assertNotDescendant(id: string, newParentId: string) {
    let cursor: string | null = newParentId;
    const visited = new Set<string>();
    while (cursor) {
      if (visited.has(cursor)) break;
      visited.add(cursor);
      if (cursor === id) {
        throw new BadRequestException({
          code: 'INVALID_PARENT',
          message: 'Cannot move a category under its own descendant',
        });
      }
      const parent: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = parent?.parentId ?? null;
    }
  }
}
