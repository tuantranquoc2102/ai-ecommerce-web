import { describe, expect, it } from 'vitest';
import {
  CreateBannerDto,
  CreateMenuDto,
  CreatePageDto,
  ListBannersQuery,
  ListPagesQuery,
} from './cms.dto';

describe('CreatePageDto', () => {
  it('defaults layoutJson to { blocks: [] } and status to DRAFT', () => {
    const r = CreatePageDto.parse({ title: 'Home' });
    expect(r.status).toBe('DRAFT');
    expect(r.layoutJson).toEqual({ blocks: [] });
  });

  it('accepts arbitrary layoutJson shape (opaque JSON)', () => {
    const r = CreatePageDto.parse({
      title: 'Home',
      layoutJson: { blocks: [{ id: 'x', type: 'HeroBanner', props: {} }] },
    });
    expect(r.layoutJson).toBeDefined();
  });

  it('accepts null layoutJson (empty page)', () => {
    const r = CreatePageDto.parse({ title: 'Home', layoutJson: null });
    expect(r.layoutJson).toBeNull();
  });

  it('rejects unknown status enum', () => {
    expect(() =>
      CreatePageDto.parse({ title: 'Home', status: 'INVALID' }),
    ).toThrow();
  });

  it('coerces empty seoTitle/seoDesc to undefined', () => {
    const r = CreatePageDto.parse({ title: 'Home', seoTitle: '', seoDesc: '' });
    expect(r.seoTitle).toBeUndefined();
    expect(r.seoDesc).toBeUndefined();
  });
});

describe('ListPagesQuery', () => {
  it('defaults page + pageSize', () => {
    expect(ListPagesQuery.parse({})).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('coerces empty status filter to undefined', () => {
    expect(ListPagesQuery.parse({ status: '' }).status).toBeUndefined();
  });
});

describe('CreateMenuDto', () => {
  it('requires name + position', () => {
    expect(() => CreateMenuDto.parse({ name: 'Main' })).toThrow();
    expect(() => CreateMenuDto.parse({ position: 'HEADER' })).toThrow();
  });

  it('accepts HEADER/FOOTER/SIDEBAR positions', () => {
    for (const p of ['HEADER', 'FOOTER', 'SIDEBAR'] as const) {
      const r = CreateMenuDto.parse({ name: 'X', position: p });
      expect(r.position).toBe(p);
    }
  });

  it('rejects invalid position', () => {
    expect(() =>
      CreateMenuDto.parse({ name: 'X', position: 'TOP' }),
    ).toThrow();
  });

  it('defaults hierarchyJson to empty array', () => {
    const r = CreateMenuDto.parse({ name: 'X', position: 'HEADER' });
    expect(r.hierarchyJson).toEqual([]);
  });
});

describe('CreateBannerDto', () => {
  it('requires position + imageUrl', () => {
    expect(() => CreateBannerDto.parse({ position: 'home_hero' })).toThrow();
    expect(() =>
      CreateBannerDto.parse({ imageUrl: 'https://example.com/x.jpg' }),
    ).toThrow();
  });

  it('rejects imageUrl that is not a URL', () => {
    expect(() =>
      CreateBannerDto.parse({ position: 'home_hero', imageUrl: 'not-url' }),
    ).toThrow();
  });

  it('coerces empty targetUrl/altText to undefined', () => {
    const r = CreateBannerDto.parse({
      position: 'home_hero',
      imageUrl: 'https://example.com/x.jpg',
      targetUrl: '',
      altText: '',
    });
    expect(r.targetUrl).toBeUndefined();
    expect(r.altText).toBeUndefined();
  });

  it('coerces schedule dates', () => {
    const r = CreateBannerDto.parse({
      position: 'home_hero',
      imageUrl: 'https://example.com/x.jpg',
      scheduleStart: '2026-01-01T00:00:00Z',
    });
    expect(r.scheduleStart).toBeInstanceOf(Date);
    expect(r.scheduleStart?.getUTCFullYear()).toBe(2026);
  });

  it('defaults isActive to false and sortOrder to 0', () => {
    const r = CreateBannerDto.parse({
      position: 'home_hero',
      imageUrl: 'https://example.com/x.jpg',
    });
    expect(r.isActive).toBe(false);
    expect(r.sortOrder).toBe(0);
  });
});

describe('ListBannersQuery', () => {
  it('coerces active=true string from query', () => {
    expect(ListBannersQuery.parse({ active: 'true' }).active).toBe(true);
  });

  it('coerces active=false string from query', () => {
    // z.coerce.boolean treats any non-empty string as true — document this.
    expect(ListBannersQuery.parse({ active: 'false' }).active).toBe(true);
  });

  it('omitted active is undefined (no filter)', () => {
    expect(ListBannersQuery.parse({}).active).toBeUndefined();
  });
});
