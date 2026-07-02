import { describe, expect, it } from 'vitest';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './product.dto';

const baseValid = {
  title: 'iPhone 15',
  type: 'PHYSICAL' as const,
  basePrice: '999.99',
};

describe('CreateProductDto', () => {
  it('parses a minimal PHYSICAL product', () => {
    const r = CreateProductDto.parse(baseValid);
    expect(r.title).toBe('iPhone 15');
    expect(r.type).toBe('PHYSICAL');
    expect(r.basePrice).toBe('999.99');
    expect(r.status).toBe('DRAFT'); // default
    expect(r.stockQuantity).toBe(0); // default
  });

  it('accepts basePrice as a number (transforms to string)', () => {
    const r = CreateProductDto.parse({ ...baseValid, basePrice: 250 });
    expect(r.basePrice).toBe('250');
  });

  it('accepts basePrice with 2 decimal places', () => {
    const r = CreateProductDto.parse({ ...baseValid, basePrice: '250.99' });
    expect(r.basePrice).toBe('250.99');
  });

  it('rejects basePrice with 3+ decimals', () => {
    expect(() => CreateProductDto.parse({ ...baseValid, basePrice: '250.999' })).toThrow();
  });

  it('rejects negative basePrice string (no sign allowed)', () => {
    expect(() => CreateProductDto.parse({ ...baseValid, basePrice: '-1' })).toThrow();
  });

  it('coerces empty slug to undefined', () => {
    const r = CreateProductDto.parse({ ...baseValid, slug: '' });
    expect(r.slug).toBeUndefined();
  });

  it('rejects invalid slug format', () => {
    expect(() =>
      CreateProductDto.parse({ ...baseValid, slug: 'Bad Slug!' }),
    ).toThrow();
  });

  it('coerces empty salePrice to undefined', () => {
    const r = CreateProductDto.parse({ ...baseValid, salePrice: '' });
    expect(r.salePrice).toBeUndefined();
  });

  it('coerces empty description/mainImage to undefined', () => {
    const r = CreateProductDto.parse({
      ...baseValid,
      description: '',
      mainImage: '',
    });
    expect(r.description).toBeUndefined();
    expect(r.mainImage).toBeUndefined();
  });

  it('rejects mainImage that is not a URL', () => {
    expect(() =>
      CreateProductDto.parse({ ...baseValid, mainImage: 'not-a-url' }),
    ).toThrow();
  });

  it('accepts DIGITAL + digitalType', () => {
    const r = CreateProductDto.parse({
      title: 'eBook',
      type: 'DIGITAL',
      digitalType: 'FILE_DOWNLOAD',
      basePrice: '9.99',
    });
    expect(r.type).toBe('DIGITAL');
    expect(r.digitalType).toBe('FILE_DOWNLOAD');
  });

  it('rejects invalid ProductType enum value', () => {
    expect(() =>
      CreateProductDto.parse({ ...baseValid, type: 'BOGUS' }),
    ).toThrow();
  });

  it('caps galleryImages at 5', () => {
    expect(() =>
      CreateProductDto.parse({
        ...baseValid,
        galleryImages: Array.from({ length: 6 }, (_, i) => `https://example.com/${i}.jpg`),
      }),
    ).toThrow();
    // 5 is the maximum allowed
    const ok = CreateProductDto.parse({
      ...baseValid,
      galleryImages: Array.from({ length: 5 }, (_, i) => `https://example.com/${i}.jpg`),
    });
    expect(ok.galleryImages).toHaveLength(5);
  });

  it('caps categoryIds at 50 and tagIds at 50', () => {
    expect(() =>
      CreateProductDto.parse({
        ...baseValid,
        categoryIds: Array.from({ length: 51 }, (_, i) => 'c' + String(i).padStart(24, '0')),
      }),
    ).toThrow();
  });
});

describe('UpdateProductDto', () => {
  it('accepts empty object', () => {
    expect(UpdateProductDto.parse({})).toEqual({});
  });

  it('allows updating status alone', () => {
    expect(UpdateProductDto.parse({ status: 'ACTIVE' })).toEqual({ status: 'ACTIVE' });
  });
});

describe('ListProductsQuery', () => {
  it('defaults page, pageSize, sort', () => {
    const r = ListProductsQuery.parse({});
    expect(r).toMatchObject({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortDir: 'desc',
    });
  });

  it('accepts filter by status', () => {
    const r = ListProductsQuery.parse({ status: 'ACTIVE' });
    expect(r.status).toBe('ACTIVE');
  });

  it('rejects unknown sortBy', () => {
    expect(() => ListProductsQuery.parse({ sortBy: 'random' })).toThrow();
  });
});
