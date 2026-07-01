import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateProductDto,
  ListProductsQuery,
  UpdateProductDto,
} from '@ecom/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toSlug } from '../../common/slug';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.categoryId
        ? { productCategories: { some: { categoryId: query.categoryId } } }
        : {}),
      ...(query.tagId ? { productTags: { some: { tagId: query.tagId } } } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip,
        take: query.pageSize,
        include: {
          productCategories: { include: { category: { select: { id: true, name: true } } } },
          productTags: { include: { tag: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        productCategories: { include: { category: true } },
        productTags: { include: { tag: true } },
      },
    });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }
    return product;
  }

  async create(input: CreateProductDto) {
    if (input.type === 'DIGITAL' && !input.digitalType) {
      throw new BadRequestException({
        code: 'DIGITAL_TYPE_REQUIRED',
        message: 'digitalType is required when type is DIGITAL',
      });
    }
    if (input.type === 'PHYSICAL' && input.digitalType) {
      throw new BadRequestException({
        code: 'DIGITAL_TYPE_NOT_ALLOWED',
        message: 'digitalType may only be set on DIGITAL products',
      });
    }

    const slug = input.slug ?? toSlug(input.title);
    const exists = await this.prisma.product.findFirst({ where: { slug } });
    if (exists) {
      throw new ConflictException({ code: 'PRODUCT_EXISTS', message: 'Slug already in use' });
    }

    await this.assertCategoriesExist(input.categoryIds);
    await this.assertTagsExist(input.tagIds);

    return this.prisma.product.create({
      data: {
        title: input.title,
        slug,
        description: input.description ?? null,
        mainImage: input.mainImage ?? null,
        galleryImages: input.galleryImages ? (input.galleryImages as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        type: input.type,
        digitalType: input.digitalType ?? null,
        basePrice: input.basePrice,
        salePrice: input.salePrice ?? null,
        stockQuantity: input.stockQuantity,
        weightGrams: input.weightGrams ?? null,
        lengthMm: input.lengthMm ?? null,
        widthMm: input.widthMm ?? null,
        heightMm: input.heightMm ?? null,
        status: input.status,
        productCategories: input.categoryIds?.length
          ? { create: input.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        productTags: input.tagIds?.length
          ? { create: input.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        productCategories: { include: { category: true } },
        productTags: { include: { tag: true } },
      },
    });
  }

  async update(id: string, input: UpdateProductDto) {
    const current = await this.findById(id);

    const nextType = input.type ?? current.type;
    const nextDigitalType = input.digitalType !== undefined ? input.digitalType : current.digitalType;
    if (nextType === 'DIGITAL' && !nextDigitalType) {
      throw new BadRequestException({
        code: 'DIGITAL_TYPE_REQUIRED',
        message: 'digitalType is required when type is DIGITAL',
      });
    }
    if (nextType === 'PHYSICAL' && nextDigitalType) {
      throw new BadRequestException({
        code: 'DIGITAL_TYPE_NOT_ALLOWED',
        message: 'digitalType may only be set on DIGITAL products',
      });
    }

    const nextSlug = input.slug ?? (input.title ? toSlug(input.title) : current.slug);
    if (nextSlug !== current.slug) {
      const conflict = await this.prisma.product.findFirst({
        where: { AND: [{ id: { not: id } }, { slug: nextSlug }] },
      });
      if (conflict) {
        throw new ConflictException({ code: 'PRODUCT_EXISTS', message: 'Slug already in use' });
      }
    }

    await this.assertCategoriesExist(input.categoryIds);
    await this.assertTagsExist(input.tagIds);

    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.ProductUpdateInput = {
        title: input.title ?? undefined,
        slug: nextSlug,
        description: input.description === undefined ? undefined : input.description,
        mainImage: input.mainImage === undefined ? undefined : input.mainImage,
        galleryImages:
          input.galleryImages === undefined
            ? undefined
            : (input.galleryImages as unknown as Prisma.InputJsonValue),
        type: input.type ?? undefined,
        digitalType: input.digitalType === undefined ? undefined : input.digitalType,
        basePrice: input.basePrice ?? undefined,
        salePrice: input.salePrice === undefined ? undefined : input.salePrice,
        stockQuantity: input.stockQuantity ?? undefined,
        weightGrams: input.weightGrams === undefined ? undefined : input.weightGrams,
        lengthMm: input.lengthMm === undefined ? undefined : input.lengthMm,
        widthMm: input.widthMm === undefined ? undefined : input.widthMm,
        heightMm: input.heightMm === undefined ? undefined : input.heightMm,
        status: input.status ?? undefined,
      };

      await tx.product.update({ where: { id }, data });

      if (input.categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (input.categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: input.categoryIds.map((categoryId) => ({ productId: id, categoryId })),
            skipDuplicates: true,
          });
        }
      }

      if (input.tagIds !== undefined) {
        await tx.productTag.deleteMany({ where: { productId: id } });
        if (input.tagIds.length > 0) {
          await tx.productTag.createMany({
            data: input.tagIds.map((tagId) => ({ productId: id, tagId })),
            skipDuplicates: true,
          });
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          productCategories: { include: { category: true } },
          productTags: { include: { tag: true } },
        },
      });
    });
  }

  async delete(id: string) {
    await this.findById(id);
    // Soft-delete: order line items reference this product with Restrict FK,
    // so a hard delete would fail once orders exist. Preserve the row.
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  private async assertCategoriesExist(ids: string[] | undefined) {
    if (!ids?.length) return;
    const unique = Array.from(new Set(ids));
    const found = await this.prisma.category.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException({
        code: 'UNKNOWN_CATEGORY',
        message: 'One or more categoryIds do not exist',
      });
    }
  }

  private async assertTagsExist(ids: string[] | undefined) {
    if (!ids?.length) return;
    const unique = Array.from(new Set(ids));
    const found = await this.prisma.tag.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException({
        code: 'UNKNOWN_TAG',
        message: 'One or more tagIds do not exist',
      });
    }
  }
}
