import { describe, expect, it } from 'vitest';
import {
  BLOCK_SCHEMAS,
  buildDefaultConfig,
  findBlockSchema,
  type BlockSchema,
} from './block-schemas';

describe('BLOCK_SCHEMAS registry', () => {
  it('contains all 14 block types the BlockRenderer dispatches', () => {
    const expected = [
      'HeroBanner',
      'BannerSlider',
      'ProductGrid',
      'CategoryList',
      'FlashSaleCountdown',
      'Testimonials',
      'TrustBadges',
      'Newsletter',
      'FAQ',
      'RichText',
      'ImageBlock',
      'CTAButton',
      'TextColumns',
      'Divider',
    ];
    const present = BLOCK_SCHEMAS.map((s) => s.blockType);
    for (const t of expected) {
      expect(present).toContain(t);
    }
    // No accidental duplicates
    expect(new Set(present).size).toBe(present.length);
  });

  it('every schema has label, description, and at least one field', () => {
    for (const schema of BLOCK_SCHEMAS) {
      expect(schema.label).toBeTruthy();
      expect(schema.description).toBeTruthy();
      expect(schema.fields.length).toBeGreaterThan(0);
    }
  });

  it('every field has key + label + type', () => {
    for (const schema of BLOCK_SCHEMAS) {
      walkFields(schema, (f) => {
        expect(f.key).toBeTruthy();
        expect(f.label).toBeTruthy();
        expect(f.type).toBeTruthy();
      });
    }
  });

  it('array fields carry a non-empty itemFields definition', () => {
    for (const schema of BLOCK_SCHEMAS) {
      walkFields(schema, (f) => {
        if (f.type === 'array') {
          expect(f.itemFields.length).toBeGreaterThan(0);
        }
      });
    }
  });
});

describe('findBlockSchema', () => {
  it('resolves a known block type', () => {
    const s = findBlockSchema('HeroBanner');
    expect(s).not.toBeNull();
    expect(s?.label).toBe('Hero Banner');
  });

  it('returns null for unknown block type', () => {
    expect(findBlockSchema('NoSuchBlock')).toBeNull();
  });

  it('is case-sensitive', () => {
    // BlockRenderer dispatches on `block.type` literal — no case coercion.
    expect(findBlockSchema('herobanner')).toBeNull();
  });
});

describe('buildDefaultConfig', () => {
  it('produces a key for every top-level field (except group)', () => {
    const schema = findBlockSchema('HeroBanner');
    expect(schema).not.toBeNull();
    const cfg = buildDefaultConfig(schema!);

    // group fields flatten their children into the top-level result
    expect(cfg).toHaveProperty('image');
    expect(cfg).toHaveProperty('align');
    expect(cfg).toHaveProperty('headline_show');
    expect(cfg).toHaveProperty('headline');
    expect(cfg).toHaveProperty('cta_label');
    expect(cfg).toHaveProperty('cta_href');
  });

  it('sets boolean defaults to false when unspecified, true when specified', () => {
    const schema = findBlockSchema('HeroBanner')!;
    const cfg = buildDefaultConfig(schema);
    // headline_show defaults to true per schema
    expect(cfg.headline_show).toBe(true);
    // cta_show defaults to true too
    expect(cfg.cta_show).toBe(true);
  });

  it('initializes array fields to []', () => {
    const schema = findBlockSchema('BannerSlider')!;
    const cfg = buildDefaultConfig(schema);
    expect(cfg.slides).toEqual([]);
  });

  it('BannerSlider config exposes autoPlayMs default', () => {
    const schema = findBlockSchema('BannerSlider')!;
    const cfg = buildDefaultConfig(schema);
    expect(cfg.autoPlayMs).toBe(5000);
  });

  it('ProductGrid limit defaults to 8', () => {
    const schema = findBlockSchema('ProductGrid')!;
    const cfg = buildDefaultConfig(schema);
    expect(cfg.limit).toBe(8);
  });

  it('CTAButton default label is populated', () => {
    const schema = findBlockSchema('CTAButton')!;
    const cfg = buildDefaultConfig(schema);
    expect(cfg.label).toBe('Shop now');
    expect(cfg.href).toBe('/products');
  });
});

function walkFields(schema: BlockSchema, visit: (f: BlockSchema['fields'][number]) => void) {
  const stack: BlockSchema['fields'] = [...schema.fields];
  while (stack.length > 0) {
    const f = stack.pop()!;
    visit(f);
    if (f.type === 'group') stack.push(...f.fields);
    if (f.type === 'array') stack.push(...f.itemFields);
  }
}
