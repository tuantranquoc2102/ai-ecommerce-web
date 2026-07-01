import { describe, it, expect } from 'vitest';
import {
  generateVariantMatrix,
  generateVariantSkus,
  VariantMatrixError,
} from './variant-matrix';

describe('generateVariantMatrix', () => {
  it('returns empty for no attributes', () => {
    expect(generateVariantMatrix([])).toEqual([]);
  });

  it('produces one combo for a single single-value attribute', () => {
    const r = generateVariantMatrix([{ attribute: 'Color', values: ['Red'] }]);
    expect(r).toEqual([{ Color: 'Red' }]);
  });

  it('expands one attribute with N values to N combos', () => {
    const r = generateVariantMatrix([{ attribute: 'Color', values: ['Red', 'Blue', 'Green'] }]);
    expect(r).toHaveLength(3);
    expect(r).toEqual([{ Color: 'Red' }, { Color: 'Blue' }, { Color: 'Green' }]);
  });

  it('cross-multiplies two attributes (2 x 3 = 6)', () => {
    const r = generateVariantMatrix([
      { attribute: 'Color', values: ['Red', 'Blue'] },
      { attribute: 'Size', values: ['S', 'M', 'L'] },
    ]);
    expect(r).toHaveLength(6);
    expect(r).toContainEqual({ Color: 'Red', Size: 'S' });
    expect(r).toContainEqual({ Color: 'Blue', Size: 'L' });
  });

  it('cross-multiplies three attributes (2 x 3 x 2 = 12)', () => {
    const r = generateVariantMatrix([
      { attribute: 'Color', values: ['Red', 'Blue'] },
      { attribute: 'Size', values: ['S', 'M', 'L'] },
      { attribute: 'Material', values: ['Cotton', 'Wool'] },
    ]);
    expect(r).toHaveLength(12);
  });

  it('produces deterministic ordering (attribute order then value order)', () => {
    const r = generateVariantMatrix([
      { attribute: 'A', values: ['1', '2'] },
      { attribute: 'B', values: ['x', 'y'] },
    ]);
    expect(r).toEqual([
      { A: '1', B: 'x' },
      { A: '1', B: 'y' },
      { A: '2', B: 'x' },
      { A: '2', B: 'y' },
    ]);
  });

  it('throws when an attribute has no values', () => {
    expect(() => generateVariantMatrix([{ attribute: 'Color', values: [] }]))
      .toThrowError(VariantMatrixError);
  });

  it('throws on empty attribute name', () => {
    expect(() => generateVariantMatrix([{ attribute: '   ', values: ['Red'] }]))
      .toThrowError(VariantMatrixError);
  });

  it('throws on empty value string', () => {
    expect(() => generateVariantMatrix([{ attribute: 'Color', values: ['Red', ' '] }]))
      .toThrowError(VariantMatrixError);
  });

  it('throws on duplicate attribute name', () => {
    expect(() => generateVariantMatrix([
      { attribute: 'Color', values: ['Red'] },
      { attribute: 'Color', values: ['Blue'] },
    ])).toThrowError(/Duplicate attribute/);
  });

  it('throws on duplicate value within attribute', () => {
    expect(() => generateVariantMatrix([{ attribute: 'Color', values: ['Red', 'Red'] }]))
      .toThrowError(/duplicate value/);
  });

  it('rejects combinations exceeding the safety cap', () => {
    const attrs = Array.from({ length: 8 }, (_, i) => ({
      attribute: `attr${i}`,
      values: ['a', 'b', 'c', 'd', 'e'],
    }));
    expect(() => generateVariantMatrix(attrs)).toThrowError(/exceeds limit/);
  });
});

describe('generateVariantSkus', () => {
  it('builds SKUs with the default strategy', () => {
    const r = generateVariantSkus('SHIRT', [
      { attribute: 'Color', values: ['Red', 'Blue'] },
      { attribute: 'Size', values: ['S', 'M'] },
    ]);
    expect(r).toHaveLength(4);
    expect(r.map((v) => v.sku)).toEqual([
      'SHIRT-RED-S',
      'SHIRT-RED-M',
      'SHIRT-BLUE-S',
      'SHIRT-BLUE-M',
    ]);
  });

  it('sanitizes whitespace and special characters in values', () => {
    const r = generateVariantSkus('PEN', [
      { attribute: 'Color', values: ['Royal Blue', 'Forest/Green'] },
    ]);
    expect(r.map((v) => v.sku)).toEqual(['PEN-ROYAL-BLUE', 'PEN-FOREST-GREEN']);
  });

  it('uses a custom strategy', () => {
    const r = generateVariantSkus(
      'X',
      [{ attribute: 'C', values: ['1', '2'] }],
      (combo) => `CUSTOM-${combo['C']}`,
    );
    expect(r.map((v) => v.sku)).toEqual(['CUSTOM-1', 'CUSTOM-2']);
  });

  it('throws when a strategy produces colliding SKUs', () => {
    expect(() =>
      generateVariantSkus(
        'X',
        [{ attribute: 'C', values: ['1', '2'] }],
        () => 'SAME',
      ),
    ).toThrowError(/SKU collision/);
  });

  it('throws on empty baseSku', () => {
    expect(() => generateVariantSkus('  ', [{ attribute: 'C', values: ['1'] }]))
      .toThrowError(/baseSku is required/);
  });
});
