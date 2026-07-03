import { Prisma } from '@prisma/client';
import type { CouponType } from '@ecom/shared';

const D = Prisma.Decimal;

export interface TotalsLineInput {
  unitPrice: Prisma.Decimal | string | number;
  quantity: number;
}

export interface CouponInput {
  type: CouponType;
  value: Prisma.Decimal | string | number;
  maxDiscount: Prisma.Decimal | string | number | null;
  minOrderValue: Prisma.Decimal | string | number | null;
}

export interface Totals {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  freeShipping: boolean;
}

/**
 * Computes order totals from lines, optional coupon, and a flat shipping fee.
 * Kept as a pure function so the same math powers both order creation and the
 * public /coupons/validate endpoint (which needs discount preview without
 * committing to the DB).
 *
 * Shipping fee is flat for now (per-order, not per-line); the caller decides
 * whether it's 0 (digital-only) or the standard rate. Tax is 0 in M3.3 — the
 * schema keeps the column so future VAT support drops in cleanly.
 */
export function computeTotals(
  lines: TotalsLineInput[],
  coupon: CouponInput | null,
  baseShippingFee: Prisma.Decimal | string | number,
): Totals {
  const subtotal = lines.reduce(
    (acc, l) => acc.add(new D(l.unitPrice.toString()).mul(l.quantity)),
    new D(0),
  );

  let discountAmount = new D(0);
  let freeShipping = false;

  if (coupon) {
    const min = coupon.minOrderValue ? new D(coupon.minOrderValue.toString()) : null;
    const meetsMin = !min || subtotal.gte(min);
    if (meetsMin) {
      const value = new D(coupon.value.toString());
      if (coupon.type === 'PERCENTAGE') {
        // value is a percent in [0, 100]
        discountAmount = subtotal.mul(value).div(100);
        if (coupon.maxDiscount) {
          const cap = new D(coupon.maxDiscount.toString());
          if (discountAmount.gt(cap)) discountAmount = cap;
        }
      } else if (coupon.type === 'FIXED_AMOUNT') {
        discountAmount = value.gt(subtotal) ? subtotal : value;
      } else if (coupon.type === 'FREE_SHIPPING') {
        freeShipping = true;
      }
    }
  }

  const shippingFee = freeShipping ? new D(0) : new D(baseShippingFee.toString());
  const taxAmount = new D(0);
  const totalAmount = subtotal.sub(discountAmount).add(shippingFee).add(taxAmount);

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    shippingFee: round2(shippingFee),
    taxAmount: round2(taxAmount),
    totalAmount: round2(totalAmount),
    freeShipping,
  };
}

function round2(d: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(d.toFixed(2));
}
