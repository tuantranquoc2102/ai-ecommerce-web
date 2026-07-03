import type { ValidateCouponResult } from '@ecom/shared';
import { apiFetch } from '../api-client';

export function validateCoupon(code: string, subtotal: number): Promise<ValidateCouponResult> {
  return apiFetch<ValidateCouponResult>('/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal }),
    auth: false,
  });
}
