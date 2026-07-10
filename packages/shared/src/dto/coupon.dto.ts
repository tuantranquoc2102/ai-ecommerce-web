import { z } from 'zod';
import { CouponType } from './order.dto';

const trimmed = (max: number) => z.string().trim().max(max);

export const ValidateCouponDto = z.object({
  code: trimmed(50).min(1),
  subtotal: z.coerce.number().nonnegative(),
});
export type ValidateCouponDto = z.infer<typeof ValidateCouponDto>;

/**
 * Result of POST /coupons/validate. `discountAmount` is 0 when `valid` is
 * false. `freeShipping` short-circuits shipping fee in the totals calculator.
 */
export interface ValidateCouponResult {
  valid: boolean;
  code: string;
  type: z.infer<typeof CouponType> | null;
  discountAmount: string;
  freeShipping: boolean;
  reason: string | null;
}

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'invalid decimal (max 2 fraction digits)');

const nullableDate = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.union([z.string().datetime(), z.date()]).transform((v) => new Date(v)),
);

export const CreateCouponDto = z
  .object({
    code: trimmed(50).min(1).transform((v) => v.toUpperCase()),
    description: trimmed(300).optional(),
    type: CouponType,
    value: decimalString,
    minOrderValue: decimalString.optional(),
    maxDiscount: decimalString.optional(),
    usageLimit: z.coerce.number().int().positive().max(1_000_000).optional(),
    startsAt: nullableDate.optional(),
    expiresAt: nullableDate.optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'FREE_SHIPPING' && v.value !== '0') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'FREE_SHIPPING coupons must use value = 0',
      });
    }
    if (v.startsAt && v.expiresAt && v.expiresAt <= v.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiresAt'],
        message: 'expiresAt must be after startsAt',
      });
    }
  });
export type CreateCouponDto = z.infer<typeof CreateCouponDto>;

export const UpdateCouponDto = z
  .object({
    code: trimmed(50).min(1).transform((v) => v.toUpperCase()).optional(),
    description: trimmed(300).optional(),
    type: CouponType.optional(),
    value: decimalString.optional(),
    minOrderValue: decimalString.optional(),
    maxDiscount: decimalString.optional(),
    usageLimit: z.coerce.number().int().positive().max(1_000_000).optional(),
    startsAt: nullableDate.optional(),
    expiresAt: nullableDate.optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'FREE_SHIPPING' && v.value !== undefined && v.value !== '0') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'FREE_SHIPPING coupons must use value = 0',
      });
    }
    if (v.startsAt && v.expiresAt && v.expiresAt <= v.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiresAt'],
        message: 'expiresAt must be after startsAt',
      });
    }
  });
export type UpdateCouponDto = z.infer<typeof UpdateCouponDto>;

export const ListCouponsQuery = z.object({
  search: trimmed(80).optional(),
  active: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : undefined))
    .optional(),
  type: CouponType.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
});
export type ListCouponsQuery = z.infer<typeof ListCouponsQuery>;

export interface CouponView {
  id: string;
  code: string;
  description: string | null;
  type: z.infer<typeof CouponType>;
  value: string;
  minOrderValue: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCoupons {
  items: CouponView[];
  total: number;
  page: number;
  pageSize: number;
}
