import { z } from 'zod';

const trimmed = (max: number) => z.string().trim().max(max);

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'invalid decimal (max 2 fraction digits)');

const nullableDate = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.union([z.string().datetime(), z.date()]).transform((v) => new Date(v)),
);

export const PromotionKind = z.enum(['FLASH_SALE', 'CAMPAIGN']);
export type PromotionKind = z.infer<typeof PromotionKind>;

export const PromotionDiscountType = z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'SET_PRICE']);
export type PromotionDiscountType = z.infer<typeof PromotionDiscountType>;

export const CreatePromotionDto = z
  .object({
    name: trimmed(120).min(1),
    code: trimmed(50)
      .min(1)
      .transform((v) => v.toUpperCase())
      .optional(),
    description: trimmed(300).optional(),
    kind: PromotionKind,
    discountType: PromotionDiscountType,
    discountValue: decimalString,
    maxDiscount: decimalString.optional(),
    startsAt: nullableDate.optional(),
    endsAt: nullableDate.optional(),
    isActive: z.boolean().default(true),
    priority: z.coerce.number().int().min(-100).max(100).default(0),
    appliesToAllProducts: z.boolean().default(false),
    productIds: z.array(z.string().cuid()).max(500).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === 'PERCENTAGE') {
      const p = Number(v.discountValue);
      if (!Number.isFinite(p) || p <= 0 || p > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discountValue'],
          message: 'PERCENTAGE requires value in (0, 100]',
        });
      }
    }
    if (v.discountType === 'SET_PRICE' && v.maxDiscount !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxDiscount'],
        message: 'maxDiscount is not used with SET_PRICE',
      });
    }
    if (!v.appliesToAllProducts && v.productIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productIds'],
        message: 'Choose at least one product or set appliesToAllProducts=true',
      });
    }
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'endsAt must be after startsAt',
      });
    }
  });
export type CreatePromotionDto = z.infer<typeof CreatePromotionDto>;

export const UpdatePromotionDto = z
  .object({
    name: trimmed(120).min(1).optional(),
    code: trimmed(50)
      .min(1)
      .transform((v) => v.toUpperCase())
      .optional(),
    description: trimmed(300).optional(),
    kind: PromotionKind.optional(),
    discountType: PromotionDiscountType.optional(),
    discountValue: decimalString.optional(),
    maxDiscount: decimalString.optional(),
    startsAt: nullableDate.optional(),
    endsAt: nullableDate.optional(),
    isActive: z.boolean().optional(),
    priority: z.coerce.number().int().min(-100).max(100).optional(),
    appliesToAllProducts: z.boolean().optional(),
    productIds: z.array(z.string().cuid()).max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === 'PERCENTAGE' && v.discountValue !== undefined) {
      const p = Number(v.discountValue);
      if (!Number.isFinite(p) || p <= 0 || p > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discountValue'],
          message: 'PERCENTAGE requires value in (0, 100]',
        });
      }
    }
    if (v.discountType === 'SET_PRICE' && v.maxDiscount !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxDiscount'],
        message: 'maxDiscount is not used with SET_PRICE',
      });
    }
    if (v.appliesToAllProducts === false && v.productIds !== undefined && v.productIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productIds'],
        message: 'Choose at least one product or set appliesToAllProducts=true',
      });
    }
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'endsAt must be after startsAt',
      });
    }
  });
export type UpdatePromotionDto = z.infer<typeof UpdatePromotionDto>;

export const ListPromotionsQuery = z.object({
  search: trimmed(80).optional(),
  active: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : undefined))
    .optional(),
  kind: PromotionKind.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
});
export type ListPromotionsQuery = z.infer<typeof ListPromotionsQuery>;

export interface PromotionView {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  kind: PromotionKind;
  discountType: PromotionDiscountType;
  discountValue: string;
  maxDiscount: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  priority: number;
  appliesToAllProducts: boolean;
  productIds: string[];
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPromotions {
  items: PromotionView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ActivePromotionInfo {
  id: string;
  name: string;
  kind: PromotionKind;
  discountType: PromotionDiscountType;
  discountValue: string;
  finalPrice: string;
}
