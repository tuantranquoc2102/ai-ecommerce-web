import { z } from 'zod';

export const ProductType = z.enum(['PHYSICAL', 'DIGITAL']);
export type ProductType = z.infer<typeof ProductType>;

export const DigitalType = z.enum(['FILE_DOWNLOAD', 'SERIAL_KEY']);
export type DigitalType = z.infer<typeof DigitalType>;

export const ProductStatus = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type ProductStatus = z.infer<typeof ProductStatus>;

const slug = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case')
    .optional(),
);

// Empty strings from form inputs get coerced to undefined so that
// "optional" fields don't fail regex/URL validation on blank submits.
const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), schema);

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'invalid decimal (max 2 fraction digits)');

/** A single attribute axis in the variant matrix, e.g. { name: 'Size', values: ['S','M'] }. */
export const ProductAttributeInput = z.object({
  name: z.string().min(1).max(60).trim(),
  values: z.array(z.string().min(1).max(60).trim()).min(1).max(50),
});
export type ProductAttributeInput = z.infer<typeof ProductAttributeInput>;

/** A materialized SKU row. `options` maps each attribute name to the chosen value. */
export const ProductVariantInput = z.object({
  sku: z.string().min(1).max(80).trim(),
  price: decimalString,
  salePrice: emptyToUndef(decimalString.optional()),
  stockQuantity: z.number().int().min(0).default(0),
  imageUrl: emptyToUndef(z.string().url().max(500).optional()),
  options: z.record(z.string(), z.string()),
});
export type ProductVariantInput = z.infer<typeof ProductVariantInput>;

/** A digital deliverable — an uploaded file (has storageKey) or an external download link. */
export const DigitalAssetInput = z.object({
  url: z.string().url().max(1000),
  storageKey: emptyToUndef(z.string().max(500).optional()),
  fileName: z.string().min(1).max(255).trim(),
  fileSize: z.number().int().min(0).default(0),
  contentType: emptyToUndef(z.string().max(150).optional()),
});
export type DigitalAssetInput = z.infer<typeof DigitalAssetInput>;

const ProductBase = z.object({
  title: z.string().min(1).max(200).trim(),
  slug,
  description: emptyToUndef(z.string().max(20000).optional()),
  mainImage: emptyToUndef(z.string().url().max(500).optional()),
  galleryImages: z.array(z.string().url().max(500)).max(5).optional(),
  type: ProductType,
  digitalType: DigitalType.optional(),
  basePrice: decimalString,
  salePrice: emptyToUndef(decimalString.optional()),
  stockQuantity: z.number().int().min(0).default(0),
  weightGrams: z.number().int().min(0).optional(),
  lengthMm: z.number().int().min(0).optional(),
  widthMm: z.number().int().min(0).optional(),
  heightMm: z.number().int().min(0).optional(),
  status: ProductStatus.default('DRAFT'),
  categoryIds: z.array(z.string().cuid()).max(50).optional(),
  tagIds: z.array(z.string().cuid()).max(50).optional(),
  // Variant matrix.
  attributes: z.array(ProductAttributeInput).max(20).optional(),
  variants: z.array(ProductVariantInput).max(500).optional(),
  // Digital deliverables (only meaningful for DIGITAL products).
  digitalAssets: z.array(DigitalAssetInput).max(20).optional(),
  // Merchandising links.
  relatedProductIds: z.array(z.string().cuid()).max(50).optional(),
  comboProductIds: z.array(z.string().cuid()).max(50).optional(),
});

/**
 * Cross-field validation shared by create + update. Runs only on the fields that
 * are present, so it works for partial (PATCH) payloads too.
 */
function refineProduct(
  data: Partial<z.infer<typeof ProductBase>>,
  ctx: z.RefinementCtx,
): void {
  const attrs = data.attributes ?? [];
  const attrNames = attrs.map((a) => a.name);

  // Unique attribute names.
  const nameSeen = new Set<string>();
  attrs.forEach((a, i) => {
    if (nameSeen.has(a.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['attributes', i, 'name'],
        message: `Duplicate attribute "${a.name}"`,
      });
    }
    nameSeen.add(a.name);
  });

  const valueMap = new Map(attrs.map((a) => [a.name, new Set(a.values)]));

  const variants = data.variants ?? [];
  if (variants.length > 0 && attrs.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['variants'],
      message: 'Variants require at least one attribute to be defined',
    });
  }

  const skuSeen = new Set<string>();
  variants.forEach((v, i) => {
    if (skuSeen.has(v.sku)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variants', i, 'sku'],
        message: `Duplicate SKU "${v.sku}"`,
      });
    }
    skuSeen.add(v.sku);

    for (const name of attrNames) {
      if (!(name in v.options)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', i, 'options'],
          message: `Missing selection for attribute "${name}"`,
        });
      }
    }
    for (const [key, value] of Object.entries(v.options)) {
      const set = valueMap.get(key);
      if (!set) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', i, 'options'],
          message: `Unknown attribute "${key}"`,
        });
      } else if (!set.has(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', i, 'options'],
          message: `"${value}" is not a value of "${key}"`,
        });
      }
    }
  });

  if (data.type === 'PHYSICAL' && (data.digitalAssets?.length ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['digitalAssets'],
      message: 'Digital assets can only be attached to DIGITAL products',
    });
  }
}

export const CreateProductDto = ProductBase.superRefine(refineProduct);
export type CreateProductDto = z.infer<typeof CreateProductDto>;

export const UpdateProductDto = ProductBase.partial().superRefine(refineProduct);
export type UpdateProductDto = z.infer<typeof UpdateProductDto>;

export const ListProductsQuery = z.object({
  search: z.string().trim().max(200).optional(),
  status: ProductStatus.optional(),
  type: ProductType.optional(),
  categoryId: z.string().cuid().optional(),
  tagId: z.string().cuid().optional(),
  /**
   * Comma-separated list of tag ids. When present, products match if they
   * carry ANY of the listed tags (OR semantics). Coexists with `tagId` for
   * back-compat; if both are present, they combine into the same OR set.
   */
  tagIds: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'basePrice']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type ListProductsQuery = z.infer<typeof ListProductsQuery>;
