import { describe, expect, it } from 'vitest';
import { CreateTagDto, ListTagsQuery, UpdateTagDto } from './tag.dto';

describe('CreateTagDto', () => {
  it('parses minimal payload (name only)', () => {
    const r = CreateTagDto.parse({ name: 'Featured' });
    expect(r).toEqual({ name: 'Featured', slug: undefined });
  });

  it('trims whitespace from name', () => {
    const r = CreateTagDto.parse({ name: '  New  Sale  ' });
    expect(r.name).toBe('New  Sale');
  });

  it('coerces empty slug to undefined (not a validation error)', () => {
    const r = CreateTagDto.parse({ name: 'X', slug: '' });
    expect(r.slug).toBeUndefined();
  });

  it('coerces null slug to undefined', () => {
    const r = CreateTagDto.parse({ name: 'X', slug: null });
    expect(r.slug).toBeUndefined();
  });

  it('accepts explicit kebab-case slug', () => {
    const r = CreateTagDto.parse({ name: 'X', slug: 'featured-summer' });
    expect(r.slug).toBe('featured-summer');
  });

  it('rejects slug with uppercase', () => {
    expect(() => CreateTagDto.parse({ name: 'X', slug: 'Featured' })).toThrow();
  });

  it('rejects slug with underscores', () => {
    expect(() => CreateTagDto.parse({ name: 'X', slug: 'featured_summer' })).toThrow();
  });

  it('rejects slug with leading hyphen', () => {
    expect(() => CreateTagDto.parse({ name: 'X', slug: '-featured' })).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => CreateTagDto.parse({ name: '' })).toThrow();
  });

  it('rejects name over 80 chars', () => {
    expect(() => CreateTagDto.parse({ name: 'a'.repeat(81) })).toThrow();
  });
});

describe('UpdateTagDto', () => {
  it('accepts empty object', () => {
    expect(UpdateTagDto.parse({})).toEqual({});
  });

  it('accepts partial (name only)', () => {
    expect(UpdateTagDto.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
  });

  it('applies same slug rules as create', () => {
    expect(() => UpdateTagDto.parse({ slug: 'BAD_SLUG' })).toThrow();
    expect(UpdateTagDto.parse({ slug: '' })).toEqual({ slug: undefined });
  });
});

describe('ListTagsQuery', () => {
  it('defaults page + pageSize when omitted', () => {
    const r = ListTagsQuery.parse({});
    expect(r).toMatchObject({ page: 1, pageSize: 50 });
  });

  it('coerces string page/pageSize (query-string typical)', () => {
    const r = ListTagsQuery.parse({ page: '3', pageSize: '20' });
    expect(r).toMatchObject({ page: 3, pageSize: 20 });
  });

  it('rejects pageSize > 200', () => {
    expect(() => ListTagsQuery.parse({ pageSize: 500 })).toThrow();
  });

  it('rejects negative page', () => {
    expect(() => ListTagsQuery.parse({ page: -1 })).toThrow();
  });
});
