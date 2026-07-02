import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

interface CategoryFixture {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  _count: { productCategories: number; children: number };
}

function makeFixture(overrides: Partial<CategoryFixture> = {}): CategoryFixture {
  return {
    id: 'c1',
    name: 'Cat',
    slug: 'cat',
    description: null,
    imageUrl: null,
    parentId: null,
    sortOrder: 0,
    _count: { productCategories: 0, children: 0 },
    ...overrides,
  };
}

function makePrisma(overrides: {
  findUnique?: jest.Mock;
  findFirst?: jest.Mock;
  findMany?: jest.Mock;
  update?: jest.Mock;
  create?: jest.Mock;
  delete?: jest.Mock;
} = {}): PrismaService {
  return {
    category: {
      findUnique: overrides.findUnique ?? jest.fn(),
      findFirst: overrides.findFirst ?? jest.fn(),
      findMany: overrides.findMany ?? jest.fn().mockResolvedValue([]),
      update: overrides.update ?? jest.fn(),
      create: overrides.create ?? jest.fn(),
      delete: overrides.delete ?? jest.fn(),
    },
  } as unknown as PrismaService;
}

describe('CategoriesService.create', () => {
  it('throws NotFound-derived BadRequest when parent id does not exist', async () => {
    const service = new CategoriesService(
      makePrisma({
        findFirst: jest.fn().mockResolvedValue(null), // no slug conflict
        findUnique: jest.fn().mockResolvedValue(null), // parent lookup returns null
      }),
    );
    await expect(
      service.create({ name: 'Child', parentId: 'ghost' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_PARENT' }),
    });
  });

  it('throws Conflict when slug already exists', async () => {
    const service = new CategoriesService(
      makePrisma({
        findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
      }),
    );
    await expect(service.create({ name: 'X', slug: 'x' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('happy path: creates with auto-generated slug', async () => {
    const create = jest.fn().mockResolvedValue(makeFixture({ name: 'Electronics', slug: 'electronics' }));
    const service = new CategoriesService(
      makePrisma({
        findFirst: jest.fn().mockResolvedValue(null),
        create,
      }),
    );
    await service.create({ name: 'Electronics' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Electronics', slug: 'electronics' }),
      }),
    );
  });
});

describe('CategoriesService.update — cycle detection', () => {
  function serviceWithTree(nodes: Array<{ id: string; parentId: string | null }>) {
    // Emulate a tree so `assertNotDescendant` can walk parents.
    const findUnique = jest.fn((args: { where: { id: string }; select?: unknown }) => {
      const node = nodes.find((n) => n.id === args.where.id);
      if (!node) return Promise.resolve(null);
      if (args.select) return Promise.resolve({ parentId: node.parentId });
      return Promise.resolve({
        ...makeFixture({ id: node.id, parentId: node.parentId }),
      });
    });
    return new CategoriesService(
      makePrisma({
        findUnique,
        findFirst: jest.fn().mockResolvedValue(null), // no slug conflicts
        update: jest.fn().mockResolvedValue(makeFixture()),
      }),
    );
  }

  it('refuses to set a category as its own parent (direct self-cycle)', async () => {
    const service = serviceWithTree([{ id: 'a', parentId: null }]);
    await expect(service.update('a', { parentId: 'a' })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_PARENT' }),
    });
  });

  it('refuses to move a category under its own descendant (transitive cycle)', async () => {
    // Tree: a → b → c   (b is child of a, c is child of b)
    // Attempt: move a under c — would create cycle a → c → b → a.
    const service = serviceWithTree([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ]);
    await expect(service.update('a', { parentId: 'c' })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_PARENT' }),
    });
  });

  it('allows valid re-parenting (unrelated branches)', async () => {
    // Tree: a and x are separate roots. Move x under a — no cycle.
    const service = serviceWithTree([
      { id: 'a', parentId: null },
      { id: 'x', parentId: null },
    ]);
    // Should NOT throw INVALID_PARENT; update is a mock so it resolves normally.
    await expect(service.update('x', { parentId: 'a' })).resolves.toBeDefined();
  });
});

describe('CategoriesService.delete', () => {
  it('refuses to delete a category with children', async () => {
    const service = new CategoriesService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(
          makeFixture({ _count: { productCategories: 0, children: 2 } }),
        ),
      }),
    );
    await expect(service.delete('c1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'CATEGORY_HAS_CHILDREN' }),
    });
  });

  it('happy path: deletes a leaf', async () => {
    const del = jest.fn();
    const service = new CategoriesService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue(makeFixture()),
        delete: del,
      }),
    );
    await service.delete('c1');
    expect(del).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('throws NotFound when target does not exist', async () => {
    const service = new CategoriesService(
      makePrisma({ findUnique: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.delete('ghost')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CategoriesService.tree', () => {
  it('assembles nested tree from flat rows', async () => {
    const flat = [
      { id: 'a', name: 'A', slug: 'a', description: null, imageUrl: null, parentId: null, sortOrder: 0, _count: { productCategories: 3 } },
      { id: 'b', name: 'B', slug: 'b', description: null, imageUrl: null, parentId: 'a', sortOrder: 0, _count: { productCategories: 1 } },
      { id: 'c', name: 'C', slug: 'c', description: null, imageUrl: null, parentId: 'b', sortOrder: 0, _count: { productCategories: 5 } },
      { id: 'root2', name: 'R2', slug: 'r2', description: null, imageUrl: null, parentId: null, sortOrder: 1, _count: { productCategories: 0 } },
    ];
    const service = new CategoriesService(
      makePrisma({ findMany: jest.fn().mockResolvedValue(flat) }),
    );

    const tree = await service.tree();

    expect(tree).toHaveLength(2); // two roots
    const a = tree.find((n) => n.id === 'a')!;
    expect(a.children).toHaveLength(1);
    expect(a.children[0]!.id).toBe('b');
    expect(a.children[0]!.children[0]!.id).toBe('c');
    expect(a.productCount).toBe(3);
  });
});
