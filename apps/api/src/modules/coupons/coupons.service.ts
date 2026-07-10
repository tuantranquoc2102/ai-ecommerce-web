import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateCouponDto,
  CouponView,
  ListCouponsQuery,
  UpdateCouponDto,
  ValidateCouponResult,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { computeTotals } from '../orders/order-totals';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCouponsQuery) {
    const where: Prisma.CouponWhereInput = {
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.active !== undefined ? { isActive: query.active } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { code: 'asc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.coupon.count({ where }),
    ]);
    return {
      items: items.map((c) => this.toView(c)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string): Promise<CouponView> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException({ code: 'COUPON_NOT_FOUND', message: 'Coupon not found' });
    }
    return this.toView(coupon);
  }

  async create(input: CreateCouponDto): Promise<CouponView> {
    const exists = await this.prisma.coupon.findUnique({ where: { code: input.code } });
    if (exists) {
      throw new ConflictException({ code: 'COUPON_EXISTS', message: 'Coupon code already exists' });
    }
    const created = await this.prisma.coupon.create({
      data: {
        code: input.code,
        description: input.description ?? null,
        type: input.type,
        value: input.value,
        minOrderValue: input.minOrderValue ?? null,
        maxDiscount: input.maxDiscount ?? null,
        usageLimit: input.usageLimit ?? null,
        startsAt: input.startsAt ?? null,
        expiresAt: input.expiresAt ?? null,
        isActive: input.isActive,
      },
    });
    return this.toView(created);
  }

  async update(id: string, input: UpdateCouponDto): Promise<CouponView> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'COUPON_NOT_FOUND', message: 'Coupon not found' });
    }
    if (input.code && input.code !== existing.code) {
      const codeUsed = await this.prisma.coupon.findUnique({ where: { code: input.code } });
      if (codeUsed) {
        throw new ConflictException({ code: 'COUPON_EXISTS', message: 'Coupon code already exists' });
      }
    }
    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        code: input.code ?? undefined,
        description: input.description === undefined ? undefined : input.description,
        type: input.type ?? undefined,
        value: input.value ?? undefined,
        minOrderValue: input.minOrderValue === undefined ? undefined : input.minOrderValue,
        maxDiscount: input.maxDiscount === undefined ? undefined : input.maxDiscount,
        usageLimit: input.usageLimit === undefined ? undefined : input.usageLimit,
        startsAt: input.startsAt === undefined ? undefined : input.startsAt,
        expiresAt: input.expiresAt === undefined ? undefined : input.expiresAt,
        isActive: input.isActive ?? undefined,
      },
    });
    return this.toView(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'COUPON_NOT_FOUND', message: 'Coupon not found' });
    }
    await this.prisma.coupon.delete({ where: { id } });
  }

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
    const normalizedCode = code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({ where: { code: normalizedCode } });
    const now = new Date();
    const empty = {
      code: normalizedCode,
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
      code: normalizedCode,
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
    const normalizedCode = code.trim().toUpperCase();
    const coupon = await tx.coupon.findUnique({ where: { code: normalizedCode } });
    if (!coupon || !coupon.isActive) return null;
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) return null;
    if (coupon.expiresAt && coupon.expiresAt < now) return null;
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return null;
    return coupon;
  }

  private toView(coupon: Prisma.CouponGetPayload<Record<string, never>>): CouponView {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description ?? null,
      type: coupon.type,
      value: coupon.value.toString(),
      minOrderValue: coupon.minOrderValue?.toString() ?? null,
      maxDiscount: coupon.maxDiscount?.toString() ?? null,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      startsAt: coupon.startsAt?.toISOString() ?? null,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  }
}
