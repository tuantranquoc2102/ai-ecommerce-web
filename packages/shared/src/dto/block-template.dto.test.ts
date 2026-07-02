import { describe, expect, it } from 'vitest';
import {
  CreateBlockTemplateDto,
  ListBlockTemplatesQuery,
  UpdateBlockTemplateDto,
} from './block-template.dto';

describe('CreateBlockTemplateDto', () => {
  it('parses minimal payload (name + blockType)', () => {
    const r = CreateBlockTemplateDto.parse({
      name: 'Summer Hero',
      blockType: 'HeroBanner',
    });
    expect(r.name).toBe('Summer Hero');
    expect(r.blockType).toBe('HeroBanner');
    expect(r.config).toEqual({});
  });

  it('accepts arbitrary config object', () => {
    const r = CreateBlockTemplateDto.parse({
      name: 'Slider',
      blockType: 'BannerSlider',
      config: {
        slides: [{ image: 'x.jpg', headline: 'Hi' }],
        autoPlayMs: 3000,
      },
    });
    expect(r.config).toMatchObject({
      autoPlayMs: 3000,
    });
  });

  it('coerces empty previewImage to undefined', () => {
    const r = CreateBlockTemplateDto.parse({
      name: 'X',
      blockType: 'HeroBanner',
      previewImage: '',
    });
    expect(r.previewImage).toBeUndefined();
  });

  it('rejects previewImage that is not a URL', () => {
    expect(() =>
      CreateBlockTemplateDto.parse({
        name: 'X',
        blockType: 'HeroBanner',
        previewImage: 'not-a-url',
      }),
    ).toThrow();
  });

  it('rejects empty name', () => {
    expect(() =>
      CreateBlockTemplateDto.parse({ name: '', blockType: 'HeroBanner' }),
    ).toThrow();
  });

  it('rejects empty blockType', () => {
    expect(() =>
      CreateBlockTemplateDto.parse({ name: 'X', blockType: '' }),
    ).toThrow();
  });
});

describe('UpdateBlockTemplateDto', () => {
  it('accepts empty object', () => {
    expect(UpdateBlockTemplateDto.parse({})).toEqual({});
  });

  it('supports name-only rename', () => {
    expect(UpdateBlockTemplateDto.parse({ name: 'Renamed' })).toEqual({
      name: 'Renamed',
    });
  });
});

describe('ListBlockTemplatesQuery', () => {
  it('defaults page + pageSize', () => {
    expect(ListBlockTemplatesQuery.parse({})).toMatchObject({
      page: 1,
      pageSize: 50,
    });
  });

  it('coerces empty blockType filter to undefined', () => {
    expect(
      ListBlockTemplatesQuery.parse({ blockType: '' }).blockType,
    ).toBeUndefined();
  });
});
