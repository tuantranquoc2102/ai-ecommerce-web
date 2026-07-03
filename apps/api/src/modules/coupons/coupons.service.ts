import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ValidateCouponResult } from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { computeTotals } from '../orders/order-totals';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates a coupon against a subtotal without touching the database beyond
   * a single read. Returns the discount amount so callers can preview the
   * total before the shopper commits to checkout.
   *
   * Reasons live behind `valid = false`:
   *   - COUPON_NOT_FOUND / COUPON_INACTIVE / COUPON_EXPIRED
   *   - COUPON_NOT_STARTED
   *   - COUPON_USAGE_LIMIT_REACHED
   *   - COUPON_MIN_ORDER_NOT_MET
   */
  async validate(code: string, subtotal: number): Promise<ValidateCouponResult> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    const now = new Date();
    const empty = {
      code,
      type: null,
      discountAmount: '0',
      freeShipping: false,
    };
    if (!coupon) return { ...empty, valid: false, reason: 'COUPON_NOT_FOUND' };
    if (!coupon.isActive) return { ...empty, valid: false, reason: 'COUPON_INACTIVE' };
    if (coupon.startsAt && coupon.startsAt > now) {
      return { ...empty, valid: false, reason: 'COUPON_NOT_STARTED' };
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return { ...empty, valid: false, reason: 'COUPON_EXPIRED' };
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return { ...empty, valid: false, reason: 'COUPON_USAGE_LIMIT_REACHED' };
    }
    if (coupon.minOrderValue && new Prisma.Decimal(subtotal).lt(coupon.minOrderValue)) {
      return { ...empty, valid: false, reason: 'COUPON_MIN_ORDER_NOT_MET' };
    }

    const totals = computeTotals(
      [{ unitPrice: subtotal, quantity: 1 }],
      {
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrderValue: coupon.minOrderValue,
      },
      0,
    );

    return {
      valid: true,
      code,
      type: coupon.type,
      discountAmount: totals.discountAmount.toString(),
      freeShipping: totals.freeShipping,
      reason: null,
    };
  }

  /**
   * Loads a coupon for use inside an order-creation transaction. Throws if
   * unusable at the moment of the check. Callers still bump `usedCount` in
   * their own transaction after successfully applying the discount.
   */
  async loadForApply(tx: Prisma.TransactionClient, code: string) {
    const coupon = await tx.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) return null;
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) return null;
    if (coupon.expiresAt && coupon.expiresAt < now) return null;
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return null;
    return coupon;
  }
}
