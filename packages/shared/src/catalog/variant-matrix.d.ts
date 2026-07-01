export type AttributeOption = {
    attribute: string;
    values: string[];
};
export type VariantCombination = Record<string, string>;
export type GeneratedVariant<T = {}> = {
    sku: string;
    combination: VariantCombination;
    extra?: T;
};
export declare class VariantMatrixError extends Error {
    readonly reason?: string | undefined;
    constructor(message: string, reason?: string | undefined);
}
export declare function generateVariantMatrix(attrs: AttributeOption[]): VariantCombination[];
export type SkuStrategy = (combo: VariantCombination, baseSku: string) => string;
export declare const defaultSkuStrategy: SkuStrategy;
export declare function generateVariantSkus(baseSku: string, attrs: AttributeOption[], strategy?: SkuStrategy): GeneratedVariant[];
//# sourceMappingURL=variant-matrix.d.ts.map