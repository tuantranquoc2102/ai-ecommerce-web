import { describe, expect, it } from 'vitest';
import { CreateCategoryDto, ListCategoriesQuery, UpdateCategoryDto } from './category.dto';

describe('CreateCategoryDto', () => {
  it('parses minimal (name only)', () => {
    const r = CreateCategoryDto.parse({ name: 'Electronics' });
    expect(r.name).toBe('Electronics');
    expect(r.slug).toBeUndefined();
    expect(r.parentId).toBeUndefined();
  });

  it('coerces empty description/imageUrl/parentId to undefined', () => {
    const r = CreateCategoryDto.parse({
      name: 'X',
      description: '',
      imageUrl: '',
      parentId: '',
    });
    expect(r.description).toBeUndefined();
    expect(r.imageUrl).toBeUndefined();
    expect(r.parentId).toBeUndefined();
  });

  it('accepts explicit parentId as cuid-shaped string', () => {
    const parentId = 'c' + '1'.repeat(24);
    const r = CreateCategoryDto.parse({ name: 'X', parentId });
    expect(r.parentId).toBe(parentId);
  });

  it('rejects imageUrl that is not a URL', () => {
    expect(() =>
      CreateCategoryDto.parse({ name: 'X', imageUrl: 'not-a-url' }),
    ).toThrow();
  });

  it('rejects sortOrder over cap (100000)', () => {
    expect(() =>
      CreateCategoryDto.parse({ name: 'X', sortOrder: 100_001 }),
    ).toThrow();
  });

  it('rejects negative sortOrder', () => {
    expect(() =>
      CreateCategoryDto.parse({ name: 'X', sortOrder: -1 }),
    ).toThrow();
  });
});

describe('UpdateCategoryDto', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(UpdateCategoryDto.parse({})).toEqual({});
  });

  it('supports moving to root (parentId=null)', () => {
    const r = UpdateCategoryDto.parse({ parentId: null });
    // Preprocess treats null the same as empty → undefined
    expect(r.parentId).toBeUndefined();
  });
});

describe('ListCategoriesQuery', () => {
  // NOTE: unlike the tag/product/user DTOs, ListCategoriesQuery does NOT use
  // the emptyToUndef preprocess — an empty search string stays as ''. The
  // backend service treats truthy/empty identically so this is fine, but it's
  // a small consistency wart worth documenting.
  it('preserves empty search string (no preprocess)', () => {
    expect(ListCategoriesQuery.parse({ search: '' })).toEqual({ search: '' });
  });

  it('trims whitespace-only search', () => {
    expect(ListCategoriesQuery.parse({ search: '  hello  ' })).toEqual({ search: 'hello' });
  });
});
