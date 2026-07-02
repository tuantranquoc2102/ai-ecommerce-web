import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Minimal Prisma stub shape — only the methods products.service calls. Each
 * test wires the fn responses to exercise a specific branch. Using a hand-
 * rolled stub instead of jest-mock-extended keeps this file dependency-free.
 */
function makePrisma(overrides: {
  productFindFirst?: jest.Mock;
  productFindMany?: jest.Mock;
  productCount?: jest.Mock;
  productCreate?: jest.Mock;
  productUpdate?: jest.Mock;
  productFindUnique?: jest.Mock;
  categoryFindMany?: jest.Mock;
  tagFindMany?: jest.Mock;
  transaction?: jest.Mock;
} = {}): PrismaService {
  return {
    product: {
      findFirst: overrides.productFindFirst ?? jest.fn(),
      findMany: overrides.productFindMany ?? jest.fn().mockResolvedValue([]),
      count: overrides.productCount ?? jest.fn().mockResolvedValue(0),
      create: overrides.productCreate ?? jest.fn(),
      update: overrides.productUpdate ?? jest.fn(),
      findUnique: overrides.productFindUnique ?? jest.fn(),
    },
    category: { findMany: overrides.categoryFindMany ?? jest.fn().mockResolvedValue([]) },
    tag: { findMany: overrides.tagFindMany ?? jest.fn().mockResolvedValue([]) },
    $transaction: overrides.transaction ?? jest.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      // Callback form used by update() — call it with a fake tx that mirrors
      // the outer prisma stub so nested tx.product.update() etc. work.
      if (typeof arg === 'function') return (arg as (tx: unknown) => Promise<unknown>)({
        product: {
          update: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn(),
        },
        productCategory: { deleteMany: jest.fn(), createMany: jest.fn() },
        productTag: { deleteMany: jest.fn(), createMany: jest.fn() },
      });
      return arg;
    }),
  } as unknown as PrismaService;
}

const baseCreate = {
  title: 'iPhone 15',
  slug: undefined,
  description: undefined,
  mainImage: undefined,
  galleryImages: undefined,
  type: 'PHYSICAL' as const,
  digitalType: undefined,
  basePrice: '999.99',
  salePrice: undefined,
  stockQuantity: 10,
  weightGrams: undefined,
  lengthMm: undefined,
  widthMm: undefined,
  heightMm: undefined,
  status: 'DRAFT' as const,
  categoryIds: undefined,
  tagIds: undefined,
};

describe('ProductsService.create', () => {
  it('rejects DIGITAL without digitalType', async () => {
    const service = new ProductsService(makePrisma());
    await expect(
      service.create({ ...baseCreate, type: 'DIGITAL', digitalType: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects PHYSICAL with digitalType', async () => {
    const service = new ProductsService(makePrisma());
    await expect(
      service.create({ ...baseCreate, type: 'PHYSICAL', digitalType: 'FILE_DOWNLOAD' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException when slug already exists', async () => {
    const service = new ProductsService(
      makePrisma({ productFindFirst: jest.fn().mockResolvedValue({ id: 'existing' }) }),
    );
    await expect(service.create({ ...baseCreate, slug: 'iphone-15' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects unknown categoryId with UNKNOWN_CATEGORY', async () => {
    // Return only 1 category found for 2 ids requested → mismatch triggers BadRequest.
    const service = new ProductsService(
      makePrisma({
        productFindFirst: jest.fn().mockResolvedValue(null),
        categoryFindMany: jest.fn().mockResolvedValue([{ id: 'c1' }]),
      }),
    );
    await expect(
      service.create({ ...baseCreate, categoryIds: ['c1', 'c2'] }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'UNKNOWN_CATEGORY' }),
    });
  });

  it('rejects unknown tagId with UNKNOWN_TAG', async () => {
    const service = new ProductsService(
      makePrisma({
        productFindFirst: jest.fn().mockResolvedValue(null),
        tagFindMany: jest.fn().mockResolvedValue([]),
      }),
    );
    await expect(
      service.create({ ...baseCreate, tagIds: ['t1'] }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'UNKNOWN_TAG' }),
    });
  });

  it('happy path: auto-generates slug from title when omitted', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'new', title: 'iPhone 15', slug: 'iphone-15' });
    const service = new ProductsService(
      makePrisma({
        productFindFirst: jest.fn().mockResolvedValue(null),
        productCreate: create,
      }),
    );

    await service.create({ ...baseCreate, slug: undefined });

    expect(create).toHaveBeenCalled();
    const arg = create.mock.calls[0]![0] as { data: { slug: string } };
    expect(arg.data.slug).toBe('iphone-15');
  });

  it('happy path: accepts DIGITAL with digitalType', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'ebook', title: 'eBook', slug: 'ebook', type: 'DIGITAL' });
    const service = new ProductsService(
      makePrisma({
        productFindFirst: jest.fn().mockResolvedValue(null),
        productCreate: create,
      }),
    );

    await service.create({
      ...baseCreate,
      title: 'eBook',
      type: 'DIGITAL',
      digitalType: 'FILE_DOWNLOAD',
    });

    expect(create).toHaveBeenCalled();
  });
});

describe('ProductsService.findById / findPublicBySlug', () => {
  it('findById throws NotFound when product missing', async () => {
    const service = new ProductsService(
      makePrisma({ productFindFirst: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.findById('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findPublicBySlug filters by status=ACTIVE + deletedAt=null', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new ProductsService(makePrisma({ productFindFirst: findFirst }));
    await expect(service.findPublicBySlug('draft-slug')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE', deletedAt: null }),
      }),
    );
  });
});

describe('ProductsService.delete', () => {
  it('soft-deletes (sets deletedAt + status=ARCHIVED), never hard-deletes', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'p1' });
    const service = new ProductsService(
      makePrisma({
        productFindFirst: jest.fn().mockResolvedValue({ id: 'p1', title: 'X' }),
        productUpdate: update,
      }),
    );

    await service.delete('p1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { deletedAt: expect.any(Date), status: 'ARCHIVED' },
    });
  });
});
