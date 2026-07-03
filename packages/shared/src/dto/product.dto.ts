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

export const CreateProductDto = z.object({
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
});
export type CreateProductDto = z.infer<typeof CreateProductDto>;

export const UpdateProductDto = CreateProductDto.partial();
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
