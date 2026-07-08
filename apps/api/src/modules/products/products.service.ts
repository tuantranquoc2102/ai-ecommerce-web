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

type TxClient = Prisma.TransactionClient;

/** Rich include used by single-product reads/writes so callers get the full editor payload. */
const productDetailInclude = {
  productCategories: { include: { category: true } },
  productTags: { include: { tag: true } },
  attributes: { include: { values: true } },
  variants: {
    include: {
      values: { include: { attributeValue: { include: { attribute: true } } } },
    },
  },
  digitalAssets: true,
  relatedProducts: {
    include: {
      relatedProduct: {
        select: { id: true, title: true, slug: true, mainImage: true, basePrice: true, type: true },
      },
    },
  },
  comboItems: {
    include: {
      comboProduct: {
        select: { id: true, title: true, slug: true, mainImage: true, basePrice: true, type: true },
      },
    },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductsQuery) {
    const tagIds = collectTagIds(query.tagId, query.tagIds);
    const priceFilter = buildPriceFilter(query.minPrice, query.maxPrice);
    const categoryFilterIds = query.categoryId
      ? await this.collectDescendantCategoryIds(query.categoryId)
      : [];

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(categoryFilterIds.length
        ? { productCategories: { some: { categoryId: { in: categoryFilterIds } } } }
        : {}),
      ...(tagIds.length ? { productTags: { some: { tagId: { in: tagIds } } } } : {}),
      ...(priceFilter ? { basePrice: priceFilter } : {}),
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
      include: productDetailInclude,
    });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }
    return product;
  }

  /**
   * Public storefront batch — returns ACTIVE, non-deleted products whose IDs
   * match. Duplicate IDs are de-duped by Prisma; caller preserves order.
   */
  async findManyPublicByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.prisma.product.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        productCategories: { include: { category: true } },
        productTags: { include: { tag: true } },
      },
    });
  }

  /**
   * Public storefront lookup — 404 for anything not ACTIVE so drafts and
   * archived products stay invisible to anonymous visitors.
   */
  async findPublicBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null, status: 'ACTIVE' },
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

    const categoryIds = await this.normalizeCategoryIdsWithAncestors(input.categoryIds);
    await this.assertCategoriesExist(categoryIds);
    await this.assertTagsExist(input.tagIds);
    const relatedProductIds = dedupe(input.relatedProductIds);
    const comboProductIds = dedupe(input.comboProductIds);
    await this.assertProductsExist([...relatedProductIds, ...comboProductIds]);
    await this.assertSkusAvailable((input.variants ?? []).map((v) => v.sku));

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
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
          productCategories: categoryIds?.length
            ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
            : undefined,
          productTags: input.tagIds?.length
            ? { create: input.tagIds.map((tagId) => ({ tagId })) }
            : undefined,
          digitalAssets: input.digitalAssets?.length
            ? { create: input.digitalAssets.map(toDigitalAssetData) }
            : undefined,
          relatedProducts: relatedProductIds.length
            ? { create: relatedProductIds.map((relatedProductId) => ({ relatedProductId })) }
            : undefined,
          comboItems: comboProductIds.length
            ? { create: comboProductIds.map((comboProductId) => ({ comboProductId })) }
            : undefined,
        },
      });

      await this.writeVariantMatrix(tx, created.id, input.attributes, input.variants);

      return tx.product.findUnique({ where: { id: created.id }, include: productDetailInclude });
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

    const categoryIds = await this.normalizeCategoryIdsWithAncestors(input.categoryIds);
    await this.assertCategoriesExist(categoryIds);
    await this.assertTagsExist(input.tagIds);

    // A product can never relate to itself.
    const relatedProductIds =
      input.relatedProductIds === undefined
        ? undefined
        : dedupe(input.relatedProductIds).filter((pid) => pid !== id);
    const comboProductIds =
      input.comboProductIds === undefined
        ? undefined
        : dedupe(input.comboProductIds).filter((pid) => pid !== id);
    await this.assertProductsExist([...(relatedProductIds ?? []), ...(comboProductIds ?? [])]);
    if (input.variants !== undefined) {
      await this.assertSkusAvailable(input.variants.map((v) => v.sku), id);
    }

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

      if (categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
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

      if (input.digitalAssets !== undefined) {
        await tx.digitalAsset.deleteMany({ where: { productId: id } });
        if (input.digitalAssets.length > 0) {
          await tx.digitalAsset.createMany({
            data: input.digitalAssets.map((a) => ({ productId: id, ...toDigitalAssetData(a) })),
          });
        }
      }

      if (relatedProductIds !== undefined) {
        await tx.productRelation.deleteMany({ where: { productId: id } });
        if (relatedProductIds.length > 0) {
          await tx.productRelation.createMany({
            data: relatedProductIds.map((relatedProductId) => ({ productId: id, relatedProductId })),
            skipDuplicates: true,
          });
        }
      }

      if (comboProductIds !== undefined) {
        await tx.productComboItem.deleteMany({ where: { productId: id } });
        if (comboProductIds.length > 0) {
          await tx.productComboItem.createMany({
            data: comboProductIds.map((comboProductId) => ({ productId: id, comboProductId })),
            skipDuplicates: true,
          });
        }
      }

      // Variant matrix is replaced wholesale when either axis is provided.
      if (input.attributes !== undefined || input.variants !== undefined) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productAttribute.deleteMany({ where: { productId: id } });
        await this.writeVariantMatrix(tx, id, input.attributes, input.variants);
      }

      return tx.product.findUnique({ where: { id }, include: productDetailInclude });
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

  private async assertProductsExist(ids: string[]) {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return;
    const found = await this.prisma.product.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException({
        code: 'UNKNOWN_PRODUCT',
        message: 'One or more related/combo product ids do not exist',
      });
    }
  }

  private async assertSkusAvailable(skus: string[], excludeProductId?: string) {
    const unique = Array.from(new Set(skus));
    if (unique.length === 0) return;
    const clash = await this.prisma.productVariant.findMany({
      where: {
        sku: { in: unique },
        ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
      },
      select: { sku: true },
    });
    if (clash.length > 0) {
      throw new ConflictException({
        code: 'SKU_EXISTS',
        message: `SKU already in use: ${clash.map((c) => c.sku).join(', ')}`,
      });
    }
  }

  /**
   * Materializes the attribute axes and their SKU variants for a product. Assumes
   * any pre-existing attributes/variants for the product have already been cleared
   * (callers run this inside a transaction). No-op when there are no attributes.
   */
  private async writeVariantMatrix(
    tx: TxClient,
    productId: string,
    attributes: CreateProductDto['attributes'],
    variants: CreateProductDto['variants'],
  ) {
    if (!attributes?.length) return;

    // attribute name -> (value -> attributeValueId)
    const valueIdByAttr = new Map<string, Map<string, string>>();
    for (const attr of attributes) {
      const createdAttr = await tx.productAttribute.create({
        data: {
          productId,
          name: attr.name,
          values: { create: attr.values.map((value) => ({ value })) },
        },
        include: { values: true },
      });
      valueIdByAttr.set(
        attr.name,
        new Map(createdAttr.values.map((v) => [v.value, v.id])),
      );
    }

    for (const variant of variants ?? []) {
      const attributeValueIds: string[] = [];
      for (const [attrName, value] of Object.entries(variant.options)) {
        const valueId = valueIdByAttr.get(attrName)?.get(value);
        if (!valueId) {
          throw new BadRequestException({
            code: 'INVALID_VARIANT_OPTION',
            message: `Variant option "${attrName}: ${value}" does not match the defined attributes`,
          });
        }
        attributeValueIds.push(valueId);
      }
      await tx.productVariant.create({
        data: {
          productId,
          sku: variant.sku,
          price: variant.price,
          salePrice: variant.salePrice ?? null,
          stockQuantity: variant.stockQuantity,
          imageUrl: variant.imageUrl ?? null,
          values: { create: attributeValueIds.map((attributeValueId) => ({ attributeValueId })) },
        },
      });
    }
  }

  /**
   * Category filter semantics for storefront: selecting a parent category
   * should include products from all descendants as well.
   */
  private async collectDescendantCategoryIds(rootId: string): Promise<string[]> {
    const out = new Set<string>([rootId]);
    let frontier = [rootId];

    while (frontier.length > 0) {
      const children = await this.prisma.category.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });
      const next: string[] = [];
      for (const child of children) {
        if (out.has(child.id)) continue;
        out.add(child.id);
        next.push(child.id);
      }
      frontier = next;
    }

    return Array.from(out);
  }

  /**
   * Data consistency: when a child category is assigned to a product, include
   * all ancestor categories too so parent views stay complete.
   */
  private async normalizeCategoryIdsWithAncestors(
    ids: string[] | undefined,
  ): Promise<string[] | undefined> {
    if (!ids?.length) return ids;

    const out = new Set(ids);
    let frontier = Array.from(out);
    while (frontier.length > 0) {
      const rows = await this.prisma.category.findMany({
        where: { id: { in: frontier } },
        select: { id: true, parentId: true },
      });

      const nextParents = new Set<string>();
      for (const row of rows) {
        if (row.parentId && !out.has(row.parentId)) {
          out.add(row.parentId);
          nextParents.add(row.parentId);
        }
      }
      frontier = Array.from(nextParents);
    }

    return Array.from(out);
  }
}

function dedupe(ids: string[] | undefined): string[] {
  return ids?.length ? Array.from(new Set(ids)) : [];
}

function toDigitalAssetData(a: NonNullable<CreateProductDto['digitalAssets']>[number]) {
  return {
    url: a.url,
    storageKey: a.storageKey ?? null,
    fileName: a.fileName,
    fileSize: a.fileSize,
    contentType: a.contentType ?? 'application/octet-stream',
  };
}

function collectTagIds(single: string | undefined, csv: string | undefined): string[] {
  const out = new Set<string>();
  if (single) out.add(single);
  if (csv) csv.split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => out.add(id));
  return Array.from(out);
}

function buildPriceFilter(min: number | undefined, max: number | undefined): Prisma.DecimalFilter | null {
  if (min === undefined && max === undefined) return null;
  const filter: Prisma.DecimalFilter = {};
  if (min !== undefined) filter.gte = new Prisma.Decimal(min);
  if (max !== undefined) filter.lte = new Prisma.Decimal(max);
  return filter;
}
