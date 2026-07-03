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
