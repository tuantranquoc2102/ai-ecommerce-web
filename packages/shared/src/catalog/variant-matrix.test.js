"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const variant_matrix_1 = require("./variant-matrix");
(0, vitest_1.describe)('generateVariantMatrix', () => {
    (0, vitest_1.it)('returns empty for no attributes', () => {
        (0, vitest_1.expect)((0, variant_matrix_1.generateVariantMatrix)([])).toEqual([]);
    });
    (0, vitest_1.it)('produces one combo for a single single-value attribute', () => {
        const r = (0, variant_matrix_1.generateVariantMatrix)([{ attribute: 'Color', values: ['Red'] }]);
        (0, vitest_1.expect)(r).toEqual([{ Color: 'Red' }]);
    });
    (0, vitest_1.it)('expands one attribute with N values to N combos', () => {
        const r = (0, variant_matrix_1.generateVariantMatrix)([{ attribute: 'Color', values: ['Red', 'Blue', 'Green'] }]);
        (0, vitest_1.expect)(r).toHaveLength(3);
        (0, vitest_1.expect)(r).toEqual([{ Color: 'Red' }, { Color: 'Blue' }, { Color: 'Green' }]);
    });
    (0, vitest_1.it)('cross-multiplies two attributes (2 x 3 = 6)', () => {
        const r = (0, variant_matrix_1.generateVariantMatrix)([
            { attribute: 'Color', values: ['Red', 'Blue'] },
            { attribute: 'Size', values: ['S', 'M', 'L'] },
        ]);
        (0, vitest_1.expect)(r).toHaveLength(6);
        (0, vitest_1.expect)(r).toContainEqual({ Color: 'Red', Size: 'S' });
        (0, vitest_1.expect)(r).toContainEqual({ Color: 'Blue', Size: 'L' });
    });
    (0, vitest_1.it)('cross-multiplies three attributes (2 x 3 x 2 = 12)', () => {
        const r = (0, variant_matrix_1.generateVariantMatrix)([
            { attribute: 'Color', values: ['Red', 'Blue'] },
            { attribute: 'Size', values: ['S', 'M', 'L'] },
            { attribute: 'Material', values: ['Cotton', 'Wool'] },
        ]);
        (0, vitest_1.expect)(r).toHaveLength(12);
    });
    (0, vitest_1.it)('produces deterministic ordering (attribute order then value order)', () => {
        const r = (0, variant_matrix_1.generateVariantMatrix)([
            { attribute: 'A', values: ['1', '2'] },
            { attribute: 'B', values: ['x', 'y'] },
        ]);
        (0, vitest_1.expect)(r).toEqual([
            { A: '1', B: 'x' },
            { A: '1', B: 'y' },
            { A: '2', B: 'x' },
            { A: '2', B: 'y' },
        ]);
    });
    (0, vitest_1.it)('throws when an attribute has no values', () => {
        (0, vitest_1.expect)(() => (0, variant_matrix_1.generateVariantMatrix)([{ attribute: 'Color', values: [] }]))
            .toThrowError(variant_matrix_1.VariantMatrixError);
    });
    (0, vitest_1.it)('throws on empty attribute name', () => {
        (0, vitest_1.expect)(() => (0, variant_matrix_1.generateVariantMatrix)([{ attribute: '   ', values: ['Red'] }]))
            .toThrowError(variant_matrix_1.VariantMatrixError);
    });
    (0, vitest_1.it)('throws on empty value string', () => {
        (0, vitest_1.expect)(() => (0, variant_matrix_1.generateVariantMatrix)([{ attribute: 'Color', values: ['Red', ' '] }]))
            .toThrowError(variant_matrix_1.VariantMatrixError);
    });
    (0, vitest_1.it)('throws on duplicate attribute name', () => {
        (0, vitest_1.expect)(() => (0, variant_matrix_1.generateVariantMatrix)([
            { attribute: 'Color', values: ['Red'] },
            { attribute: 'Color', values: ['Blue'] },
        ])).toThrowError(/Duplicate attribute/);
    });
    (0, vitest_1.it)('throws on duplicate value within attribute', () => {
        (0, vitest_1.expect)(() => (0, variant_matrix_1.generateVariantMatrix)([{ attribute: 'Color', values: ['Red', 'Red'] }]))
            .toThrowError(/duplicate value/);
    });
    (0, vitest_1.it)('rejects combinations exceeding the safety cap', () => {
        const attrs = Array.from({ length: 8 }, (_, i) => ({
            attribute: `attr${i}`,
            values: ['a', 'b', 'c', 'd', 'e'],
        }));
        (0, vitest_1.expect)(() => (0, variant_matrix_1.generateVariantMatrix)(attrs)).toThrowError(/exceeds limit/);
    });
});
(0, vitest_1.describe)('generateVariantSkus', () => {
    (0, vitest_1.it)('builds SKUs with the default strategy', () => {
        const r = (0, variant_matrix_1.generateVariantSkus)('SHIRT', [
            { attribute: 'Color', values: ['Red', 'Blue'] },
            { attribute: 'Size', values: ['S', 'M'] },
        ]);
        (0, vitest_1.expect)(r).toHaveLength(4);
        (0, vitest_1.expect)(r.map((v) => v.sku)).toEqual([
            'SHIRT-RED-S',
            'SHIRT-RED-M',
            'SHIRT-BLUE-S',
            'SHIRT-BLUE-M',
        ]);
    });
    (0, vitest_1.it)('sanitizes whitespace and special characters in values', () => {
        const r = (0, variant_matrix_1.generateVariantSkus)('PEN', [
            { attribute: 'Color', values: ['Royal Blue', 'Forest/Green'] },
        ]);
        (0, vitest_1.expect)(r.map((v) => v.sku)).toEqual(['PEN-ROYAL-BLUE', 'PEN-FOREST-GREEN']);
    });
    (0, vitest_1.it)('uses a custom strategy', () => {
        const r = (0, variant_matrix_1.generateVariantSkus)('X', [{ attribute: 'C', values: ['1', '2'] }], (combo) => `CUSTOM-${combo['C']}`);
        (0, vitest_1.expect)(r.map((v) => v.sku)).toEqual(['CUSTOM-1', 'CUSTOM-2']);
    });
    (0, vitest_1.it)('throws when a strategy produces colliding SKUs', () => {
        (0, vitest_1.expect)(() => (0, variant_matrix_1.generateVariantSkus)('X', [{ attribute: 'C', values: ['1', '2'] }], () => 'SAME')).toThrowError(/SKU collision/);
    });
    (0, vitest_1.it)('throws on empty baseSku', () => {
        (0, vitest_1.expect)(() => (0, variant_matrix_1.generateVariantSkus)('  ', [{ attribute: 'C', values: ['1'] }]))
            .toThrowError(/baseSku is required/);
    });
});
//# sourceMappingURL=variant-matrix.test.js.map