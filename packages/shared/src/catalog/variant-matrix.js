"use strict";
// Cartesian product of attribute values -> SKU variant combinations.
// Used by the admin product editor to materialize every SKU row from the
// attribute matrix the merchandiser entered.
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSkuStrategy = exports.VariantMatrixError = void 0;
exports.generateVariantMatrix = generateVariantMatrix;
exports.generateVariantSkus = generateVariantSkus;
class VariantMatrixError extends Error {
    constructor(message, reason) {
        super(message);
        this.reason = reason;
        this.name = 'VariantMatrixError';
    }
}
exports.VariantMatrixError = VariantMatrixError;
const MAX_COMBINATIONS = 5_000;
function generateVariantMatrix(attrs) {
    if (attrs.length === 0)
        return [];
    const seenAttr = new Set();
    let totalSize = 1;
    for (const a of attrs) {
        if (!a.attribute || !a.attribute.trim()) {
            throw new VariantMatrixError('Attribute name is required', 'EMPTY_ATTRIBUTE_NAME');
        }
        if (seenAttr.has(a.attribute)) {
            throw new VariantMatrixError(`Duplicate attribute "${a.attribute}"`, 'DUPLICATE_ATTRIBUTE');
        }
        seenAttr.add(a.attribute);
        if (!a.values.length) {
            throw new VariantMatrixError(`Attribute "${a.attribute}" has no values`, 'EMPTY_VALUES');
        }
        const seenVal = new Set();
        for (const v of a.values) {
            if (!v || !v.trim()) {
                throw new VariantMatrixError(`Attribute "${a.attribute}" has an empty value`, 'EMPTY_VALUE');
            }
            if (seenVal.has(v)) {
                throw new VariantMatrixError(`Attribute "${a.attribute}" has duplicate value "${v}"`, 'DUPLICATE_VALUE');
            }
            seenVal.add(v);
        }
        totalSize *= a.values.length;
        if (totalSize > MAX_COMBINATIONS) {
            throw new VariantMatrixError(`Combination count exceeds limit of ${MAX_COMBINATIONS}`, 'TOO_MANY_COMBINATIONS');
        }
    }
    return attrs.reduce((acc, attr) => acc.flatMap((combo) => attr.values.map((v) => ({ ...combo, [attr.attribute]: v }))), [{}]);
}
const defaultSkuStrategy = (combo, baseSku) => {
    const suffix = Object.values(combo)
        .map((v) => v.toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-'))
        .join('-');
    return suffix ? `${baseSku}-${suffix}` : baseSku;
};
exports.defaultSkuStrategy = defaultSkuStrategy;
function generateVariantSkus(baseSku, attrs, strategy = exports.defaultSkuStrategy) {
    if (!baseSku || !baseSku.trim()) {
        throw new VariantMatrixError('baseSku is required', 'EMPTY_BASE_SKU');
    }
    const combos = generateVariantMatrix(attrs);
    const skuSet = new Set();
    const out = [];
    for (const combination of combos) {
        const sku = strategy(combination, baseSku);
        if (skuSet.has(sku)) {
            throw new VariantMatrixError(`SKU collision on "${sku}" — strategy not unique`, 'SKU_COLLISION');
        }
        skuSet.add(sku);
        out.push({ sku, combination });
    }
    return out;
}
//# sourceMappingURL=variant-matrix.js.map