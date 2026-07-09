import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdminListOrdersQuery,
  CheckoutResult,
  CreateOrderDto,
  MyOrdersQuery,
  OrderStatus,
  OrderView,
  PaginatedOrders,
  RefundOrderDto,
  UpdateOrderStatusDto,
  UpdateShippingDto,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { generateOrderNumber } from '../../common/order-number';
import { ENV_TOKEN, type AppEnv } from '../../config/env';
import { CouponsService } from '../coupons/coupons.service';
import { PaymentsService } from '../payments/payments.service';
import { OrderTokensService } from './order-tokens.service';
import { computeTotals } from './order-totals';
import { assertTransition } from './order-status';

/** Flat shipping fee applied at checkout. Later this can flex by weight/region. */
const DEFAULT_SHIPPING_FEE = new Prisma.Decimal(30_000);

const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, slug: true, title: true, mainImage: true } },
    },
  },
  shipping: true,
  payments: { orderBy: { createdAt: 'desc' as const } },
  coupon: { select: { code: true } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly payments: PaymentsService,
    private readonly tokens: OrderTokensService,
    private readonly mail: MailService,
    @Inject(ENV_TOKEN) private readonly env: AppEnv,
  ) {}

  /**
   * Creates a PENDING order + payment session in a single transaction:
   *   1. Load requested products/variants; verify ACTIVE + non-deleted.
   *   2. Verify stock (stockQuantity - reservedStock >= qty) for PHYSICAL items.
   *   3. Compute totals (subtotal, discount from coupon, shipping, tax, total).
   *   4. Insert Order + OrderItem[] + ShippingInfo; bump reservedStock; bump
   *      Coupon.usedCount if applied.
   *   5. Delegate to PaymentsService.startSession for the redirect URL.
   *   6. Issue a guest token so unauthenticated buyers can view their order.
   *
   * Guest checkout requires `contactEmail`; authenticated checkout ignores it
   * and stores the user's own email so history stays consistent even if the
   * user later changes their account email.
   */
  async createDraft(
    input: CreateOrderDto,
    user: { id: string; email: string } | null,
  ): Promise<CheckoutResult> {
    if (!user && !input.contactEmail) {
      throw new BadRequestException({
        code: 'CONTACT_EMAIL_REQUIRED',
        message: 'contactEmail is required for guest checkout',
      });
    }

    const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
    const variantIds = Array.from(
      new Set(input.items.map((i) => i.variantId).filter((v): v is string => !!v)),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null, status: 'ACTIVE' },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException({
          code: 'PRODUCT_UNAVAILABLE',
          message: 'One or more items are no longer available',
        });
      }
      const productById = new Map(products.map((p) => [p.id, p]));

      const variants = variantIds.length
        ? await tx.productVariant.findMany({ where: { id: { in: variantIds } } })
        : [];
      const variantById = new Map(variants.map((v) => [v.id, v]));
      if (variants.length !== variantIds.length) {
        throw new BadRequestException({
          code: 'VARIANT_UNAVAILABLE',
          message: 'One or more product variants are unavailable',
        });
      }

      // Verify variants belong to their claimed products.
      for (const item of input.items) {
        if (item.variantId) {
          const v = variantById.get(item.variantId);
          if (!v || v.productId !== item.productId) {
            throw new BadRequestException({
              code: 'VARIANT_MISMATCH',
              message: 'Variant does not belong to the given product',
            });
          }
        }
      }

      // Resolve effective unit price and stock check.
      const lines = input.items.map((item) => {
        const product = productById.get(item.productId)!;
        const variant = item.variantId ? variantById.get(item.variantId)! : null;
        const unitPrice = variant
          ? variant.salePrice ?? variant.price
          : product.salePrice ?? product.basePrice;
        const titleSnapshot = variant
          ? `${product.title} · ${variant.sku}`
          : product.title;

        if (product.type === 'PHYSICAL') {
          const available = variant
            ? variant.stockQuantity - variant.reservedStock
            : product.stockQuantity - product.reservedStock;
          if (available < item.quantity) {
            throw new BadRequestException({
              code: 'INSUFFICIENT_STOCK',
              message: `Not enough stock for "${product.title}"`,
              details: { productId: product.id, requested: item.quantity, available },
            });
          }
        }

        return { product, variant, item, unitPrice, titleSnapshot };
      });

      // Optional coupon.
      const coupon = input.couponCode
        ? await this.coupons.loadForApply(tx, input.couponCode)
        : null;
      if (input.couponCode && !coupon) {
        throw new BadRequestException({
          code: 'COUPON_INVALID',
          message: 'Coupon is not valid at this time',
        });
      }

      const totals = computeTotals(
        lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.item.quantity })),
        coupon
          ? {
              type: coupon.type,
              value: coupon.value,
              maxDiscount: coupon.maxDiscount,
              minOrderValue: coupon.minOrderValue,
            }
          : null,
        DEFAULT_SHIPPING_FEE,
      );

      if (coupon && coupon.minOrderValue && totals.subtotal.lt(coupon.minOrderValue)) {
        throw new BadRequestException({
          code: 'COUPON_MIN_ORDER_NOT_MET',
          message: 'Order subtotal does not meet the coupon minimum',
        });
      }

      const paymentExpiresAt = new Date(
        Date.now() + this.env.ORDER_PAYMENT_TIMEOUT_MINUTES * 60_000,
      );

      // Order number with one retry on collision.
      let orderNumber = generateOrderNumber(this.env.ORDER_NUMBER_PREFIX);
      const created = await this.tryCreateOrder(tx, orderNumber, {
        user,
        input,
        lines,
        totals,
        couponId: coupon?.id ?? null,
        paymentExpiresAt,
      }).catch(async (e) => {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          orderNumber = generateOrderNumber(this.env.ORDER_NUMBER_PREFIX);
          return this.tryCreateOrder(tx, orderNumber, {
            user,
            input,
            lines,
            totals,
            couponId: coupon?.id ?? null,
            paymentExpiresAt,
          });
        }
        throw e;
      });

      await this.recordStatusHistory(tx, created.id, null, 'PENDING', 'Order placed');

      // Reserve stock atomically. The earlier in-memory check was optimistic
      // (two concurrent checkouts could both read `available >= qty` before
      // either wrote). Reserving with a conditional UPDATE ... WHERE stock -
      // reserved >= qty means the DB is the single source of truth and
      // second-through-Nth concurrent buyers get rejected on the update
      // rather than oversell. If any line's row-count comes back as 0 we
      // throw and let the enclosing transaction roll back — including the
      // Order row we just inserted.
      for (const l of lines) {
        if (l.product.type !== 'PHYSICAL') continue;
        const qty = l.item.quantity;
        const [table, id] = l.variant
          ? (['ProductVariant', l.variant.id] as const)
          : (['Product', l.product.id] as const);
        const affected = await tx.$executeRawUnsafe(
          `UPDATE "${table}" SET "reservedStock" = "reservedStock" + $1, "updatedAt" = NOW() WHERE "id" = $2 AND "stockQuantity" - "reservedStock" >= $1`,
          qty,
          id,
        );
        if (affected === 0) {
          throw new BadRequestException({
            code: 'INSUFFICIENT_STOCK',
            message: `Not enough stock for "${l.product.title}"`,
            details: { productId: l.product.id, requested: qty },
          });
        }
      }

      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    const session = await this.payments.startSession(result, input.paymentProvider);

    const isGuest = !user;
    const token = isGuest ? await this.tokens.issue(result.orderNumber) : undefined;

    return {
      orderNumber: result.orderNumber,
      token,
      redirectUrl: session.redirectUrl ?? undefined,
    };
  }

  private async tryCreateOrder(
    tx: Prisma.TransactionClient,
    orderNumber: string,
    ctx: {
      user: { id: string; email: string } | null;
      input: CreateOrderDto;
      lines: Array<{
        product: { id: string; title: string };
        variant: { id: string } | null;
        item: { quantity: number };
        unitPrice: Prisma.Decimal;
        titleSnapshot: string;
      }>;
      totals: ReturnType<typeof computeTotals>;
      couponId: string | null;
      paymentExpiresAt: Date;
    },
  ) {
    const contactEmail = ctx.user?.email ?? ctx.input.contactEmail!;
    return tx.order.create({
      data: {
        orderNumber,
        userId: ctx.user?.id ?? null,
        contactEmail,
        status: 'PENDING',
        subtotal: ctx.totals.subtotal,
        shippingFee: ctx.totals.shippingFee,
        discountAmount: ctx.totals.discountAmount,
        taxAmount: ctx.totals.taxAmount,
        totalAmount: ctx.totals.totalAmount,
        currency: 'VND',
        couponId: ctx.couponId,
        notes: ctx.input.notes ?? null,
        paymentExpiresAt: ctx.paymentExpiresAt,
        items: {
          create: ctx.lines.map((l) => ({
            productId: l.product.id,
            variantId: l.variant?.id ?? null,
            titleSnapshot: l.titleSnapshot,
            unitPrice: l.unitPrice,
            quantity: l.item.quantity,
            lineTotal: l.unitPrice.mul(l.item.quantity),
          })),
        },
        shipping: {
          create: {
            recipientName: ctx.input.shipping.recipientName,
            recipientPhone: ctx.input.shipping.recipientPhone,
            addressLine: ctx.input.shipping.addressLine,
            ward: ctx.input.shipping.ward ?? null,
            district: ctx.input.shipping.district ?? null,
            province: ctx.input.shipping.province ?? null,
            postalCode: ctx.input.shipping.postalCode ?? null,
          },
        },
      },
    });
  }

  /**
   * Marks an order paid. Called by PaymentsService on successful IPN or by the
   * admin transition path when a COD order moves from PENDING → PROCESSING
   * (COD auto-promotes through PAID first).
   *
   * Idempotent: repeat calls for an already-PAID order return early.
   */
  async markPaid(orderId: string, paymentTxnId?: string): Promise<void> {
    // Everything the confirmation email needs is captured inside the tx and
    // dispatched after it commits — so a mail-provider hiccup can never
    // block or roll back a successful payment.
    let mailContext: OrderPaidMailContext | null = null;

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, type: true, digitalType: true, title: true, mainImage: true },
              },
            },
          },
          shipping: true,
          payments: { orderBy: { createdAt: 'desc' } },
          user: { select: { firstName: true } },
        },
      });
      if (!order) {
        throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
      }
      if (order.status !== 'PENDING') {
        this.logger.log(`markPaid called on order ${order.orderNumber} in status ${order.status} — no-op`);
        return;
      }

      // Move reserved → sold stock. Only PHYSICAL lines had reservedStock
      // bumped at checkout; DIGITAL lines are skipped so we don't drive
      // reservedStock negative.
      for (const item of order.items) {
        if (item.product.type !== 'PHYSICAL') continue;
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              reservedStock: { decrement: item.quantity },
              stockQuantity: { decrement: item.quantity },
            },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              reservedStock: { decrement: item.quantity },
              stockQuantity: { decrement: item.quantity },
            },
          });
        }
      }

      // Issue digital entitlements. Guests (no linked user) can't be granted
      // downloads yet — log so the admin can manually attach later once the
      // guest creates an account (customer-service workflow, out of scope
      // for this batch). Signed-in DIGITAL buyers get one entitlement per
      // unit; SERIAL_KEY products consume unused keys from the pool.
      for (const item of order.items) {
        if (item.product.type !== 'DIGITAL' || !order.userId) continue;
        await this.grantDigitalEntitlements(tx, {
          userId: order.userId,
          orderItemId: item.id,
          productId: item.productId,
          digitalType: item.product.digitalType,
          quantity: item.quantity,
          orderNumber: order.orderNumber,
        });
      }

      const paidAt = new Date();
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID', paidAt },
      });

      await this.recordStatusHistory(
        tx,
        orderId,
        order.status as OrderStatus,
        'PAID',
        'Payment received',
      );

      if (paymentTxnId) {
        await tx.payment.updateMany({
          where: { orderId, providerTxnId: paymentTxnId },
          data: { status: 'SUCCEEDED', ipnReceivedAt: new Date() },
        });
      } else {
        // COD: mark the (single) PENDING payment as SUCCEEDED.
        await tx.payment.updateMany({
          where: { orderId, status: 'PENDING' },
          data: { status: 'SUCCEEDED', ipnReceivedAt: new Date() },
        });
      }

      // Snapshot everything the mail template needs from within the tx so
      // the read is consistent with the writes we just committed.
      if (order.contactEmail) {
        mailContext = {
          contactEmail: order.contactEmail,
          firstName: order.user?.firstName ?? null,
          orderNumber: order.orderNumber,
          paidAt,
          isGuest: order.userId === null,
          items: order.items.map((it) => ({
            title: it.titleSnapshot,
            quantity: it.quantity,
            unitPrice: it.unitPrice.toString(),
            lineTotal: it.lineTotal.toString(),
            mainImage: it.product.mainImage,
          })),
          subtotal: order.subtotal.toString(),
          discountAmount: order.discountAmount.toString(),
          shippingFee: order.shippingFee.toString(),
          totalAmount: order.totalAmount.toString(),
          shipping: order.shipping
            ? {
                recipientName: order.shipping.recipientName,
                recipientPhone: order.shipping.recipientPhone,
                addressLine: order.shipping.addressLine,
                ward: order.shipping.ward,
                district: order.shipping.district,
                province: order.shipping.province,
              }
            : null,
          paymentProvider: order.payments[0]?.provider ?? 'COD',
        };
      }
    });

    if (mailContext) {
      // Fire-and-forget. The order is already PAID by the time we get here.
      void this.dispatchOrderConfirmation(mailContext);
    }
  }

  private async dispatchOrderConfirmation(ctx: OrderPaidMailContext): Promise<void> {
    try {
      // Fresh view-order token so the link in the email works for guests
      // whose original checkout token may have expired. Auth users don't
      // strictly need the token but it doesn't hurt to include it.
      const token = ctx.isGuest ? await this.tokens.issue(ctx.orderNumber) : null;
      const viewUrl = token
        ? `${this.env.FRONTEND_URL}/orders/${ctx.orderNumber}?token=${token}`
        : `${this.env.FRONTEND_URL}/orders/${ctx.orderNumber}`;

      const hasDiscount = Number(ctx.discountAmount) > 0;
      const shippingFormatted =
        Number(ctx.shippingFee) === 0 ? 'Free' : formatVnd(ctx.shippingFee);

      await this.mail.sendOrderConfirmation({
        to: ctx.contactEmail,
        firstName: ctx.firstName,
        orderNumber: ctx.orderNumber,
        paidAt: ctx.paidAt,
        items: ctx.items.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          unitPriceFormatted: formatVnd(i.unitPrice),
          lineTotalFormatted: formatVnd(i.lineTotal),
          imageUrl: i.mainImage,
        })),
        subtotalFormatted: formatVnd(ctx.subtotal),
        discountFormatted: hasDiscount ? formatVnd(ctx.discountAmount) : null,
        shippingFormatted,
        totalFormatted: formatVnd(ctx.totalAmount),
        shipping: ctx.shipping,
        paymentMethod: formatPaymentMethod(ctx.paymentProvider),
        viewOrderUrl: viewUrl,
      });
    } catch (e) {
      this.logger.error(
        `Failed to send order-confirmation mail for ${ctx.orderNumber}: ${(e as Error).message}`,
      );
    }
  }

  private async grantDigitalEntitlements(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      orderItemId: string;
      productId: string;
      digitalType: 'FILE_DOWNLOAD' | 'SERIAL_KEY' | null;
      quantity: number;
      orderNumber: string;
    },
  ): Promise<void> {
    if (input.digitalType === 'SERIAL_KEY') {
      const availableKeys = await tx.serialKey.findMany({
        where: { productId: input.productId, isUsed: false, entitlement: null },
        take: input.quantity,
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      for (const key of availableKeys) {
        await tx.serialKey.update({ where: { id: key.id }, data: { isUsed: true } });
        await tx.digitalEntitlement.create({
          data: {
            userId: input.userId,
            orderItemId: input.orderItemId,
            serialKeyId: key.id,
          },
        });
      }
      const shortfall = input.quantity - availableKeys.length;
      if (shortfall > 0) {
        // Create key-less entitlements so the customer sees "download pending"
        // rather than nothing; admin gets alerted below.
        this.logger.warn(
          `SerialKey shortfall on order ${input.orderNumber}: ${shortfall}/${input.quantity} for product ${input.productId} — key-less entitlements created, admin must attach keys`,
        );
        for (let i = 0; i < shortfall; i++) {
          await tx.digitalEntitlement.create({
            data: { userId: input.userId, orderItemId: input.orderItemId },
          });
        }
      }
      return;
    }
    // FILE_DOWNLOAD (or unspecified — defensive default): one entitlement per
    // unit so refunds can revoke individually if needed later.
    for (let i = 0; i < input.quantity; i++) {
      await tx.digitalEntitlement.create({
        data: { userId: input.userId, orderItemId: input.orderItemId },
      });
    }
  }

  /**
   * Applies an admin-driven status change, enforcing the allowed transitions.
   * Special case: COD orders can be moved PENDING → PROCESSING; the service
   * auto-promotes through PAID (marks stock consumed + records payment).
   */
  async transitionStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    actorUserId?: string,
    note?: string,
  ): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    const isCod = order.payments.some((p) => p.provider === 'COD');
    let paidPromoted = false;
    if (
      isCod &&
      order.status === 'PENDING' &&
      (dto.status === 'PROCESSING' || dto.status === 'SHIPPING' || dto.status === 'COMPLETED')
    ) {
      // Two-step for COD: PENDING → PAID → target
      await this.markPaid(order.id);
      paidPromoted = true;
    } else if (order.status === 'PENDING' && dto.status === 'PAID') {
      // Non-COD paths use markPaid so stock/payment stay consistent.
      await this.markPaid(order.id);
      paidPromoted = true;
    } else {
      assertTransition(order.status, dto.status);
    }

    const now = new Date();
    const patch: Prisma.OrderUpdateInput = { status: dto.status };
    if (dto.status === 'CANCELLED') patch.cancelledAt = now;
    if (dto.status === 'COMPLETED') patch.completedAt = now;

    await this.prisma.$transaction(async (tx) => {
      // Release reserved stock for CANCELLED/EXPIRED coming from PENDING.
      if (
        (dto.status === 'CANCELLED' || dto.status === 'EXPIRED') &&
        order.status === 'PENDING'
      ) {
        const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
        for (const item of items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { reservedStock: { decrement: item.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { reservedStock: { decrement: item.quantity } },
            });
          }
        }
      }

      await tx.order.update({ where: { id: order.id }, data: patch });

      // markPaid (when it promoted the order) already logged the PAID step;
      // here we log the subsequent step (or the direct transition when no
      // promotion happened). Skip when there's nothing new to record.
      const historyFrom: OrderStatus = paidPromoted
        ? 'PAID'
        : (order.status as OrderStatus);
      if (historyFrom !== dto.status) {
        await this.recordStatusHistory(
          tx,
          order.id,
          historyFrom,
          dto.status,
          note,
          actorUserId,
        );
      }

      if (dto.carrier !== undefined || dto.trackingCode !== undefined) {
        await tx.shippingInfo.update({
          where: { orderId: order.id },
          data: {
            carrier: dto.carrier ?? undefined,
            trackingCode: dto.trackingCode ?? undefined,
            shippedAt: dto.status === 'SHIPPING' ? now : undefined,
            deliveredAt: dto.status === 'COMPLETED' ? now : undefined,
          },
        });
      }
    });

    return this.findOne(id);
  }

  /**
   * Records a refund against a paid order: flips status to REFUNDED, captures
   * the refunded amount / reason / timestamp, returns sold stock (unless the
   * caller opts out), and writes a REFUNDED payment ledger row. The actual
   * gateway money-movement is handled out-of-band.
   */
  async refund(id: string, dto: RefundOrderDto, actorUserId?: string): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { type: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    assertTransition(order.status as OrderStatus, 'REFUNDED');

    const refundAmount = dto.amount ? new Prisma.Decimal(dto.amount) : order.totalAmount;
    const now = new Date();
    const provider = order.payments[0]?.provider ?? 'COD';

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          refundedAmount: refundAmount,
          refundedAt: now,
          refundReason: dto.reason,
        },
      });

      if (dto.restock !== false) {
        for (const item of order.items) {
          if (item.product.type !== 'PHYSICAL') continue;
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stockQuantity: { increment: item.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { increment: item.quantity } },
            });
          }
        }
      }

      await tx.payment.create({
        data: {
          orderId: id,
          provider,
          amount: refundAmount,
          currency: order.currency,
          status: 'REFUNDED',
          providerTxnId: null,
        },
      });

      await this.recordStatusHistory(
        tx,
        id,
        order.status as OrderStatus,
        'REFUNDED',
        dto.reason,
        actorUserId,
      );
    });

    return this.findOne(id);
  }

  /**
   * Standalone edit of an order's shipping info (recipient/address/carrier/
   * tracking) without a status change. Only fields present in the DTO are
   * written; everything else is left untouched.
   */
  async updateShipping(id: string, dto: UpdateShippingDto): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    const data: Prisma.ShippingInfoUpdateInput = {};
    if (dto.recipientName !== undefined) data.recipientName = dto.recipientName;
    if (dto.recipientPhone !== undefined) data.recipientPhone = dto.recipientPhone;
    if (dto.addressLine !== undefined) data.addressLine = dto.addressLine;
    if (dto.ward !== undefined) data.ward = dto.ward;
    if (dto.district !== undefined) data.district = dto.district;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.postalCode !== undefined) data.postalCode = dto.postalCode;
    if (dto.carrier !== undefined) data.carrier = dto.carrier;
    if (dto.trackingCode !== undefined) data.trackingCode = dto.trackingCode;

    await this.prisma.shippingInfo.update({ where: { orderId: id }, data });

    return this.findOne(id);
  }

  /**
   * Sweeper for PENDING orders past their paymentExpiresAt. Called by the
   * expiration cron; batches updates in small chunks to keep transactions
   * short even if lots of orders expire at once.
   */
  async expirePending(): Promise<number> {
    const stale = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentExpiresAt: { not: null, lt: new Date() },
      },
      select: { id: true },
      take: 100,
    });
    for (const { id } of stale) {
      await this.transitionStatus(id, { status: 'EXPIRED' }, undefined, 'Payment window expired');
    }
    return stale.length;
  }

  async listAdmin(query: AdminListOrdersQuery): Promise<PaginatedOrders> {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.paymentProvider ? { payments: { some: { provider: query.paymentProvider } } } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' } },
              { contactEmail: { contains: query.search, mode: 'insensitive' } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { [query.sortBy]: query.sortDir },
        skip,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toView(r)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findMyOrders(userId: string, query: MyOrdersQuery): Promise<PaginatedOrders> {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toView(r)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: string): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }
    return this.toView(order);
  }

  /**
   * Guest confirmation lookup. Verifies the Redis token before returning the
   * order, so the URL is unshareable outside the buyer's browser.
   */
  async findByNumberForGuest(orderNumber: string, token: string): Promise<OrderView> {
    const ok = await this.tokens.verify(orderNumber, token);
    if (!ok) {
      throw new ForbiddenException({ code: 'INVALID_ORDER_TOKEN', message: 'Invalid order token' });
    }
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }
    return this.toView(order);
  }

  async findMineByNumber(userId: string, orderNumber: string): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: ORDER_INCLUDE,
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }
    return this.toView(order);
  }

  private toView(o: OrderWithRelations): OrderView {
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status as OrderStatus,
      userId: o.userId,
      contactEmail: o.contactEmail,
      subtotal: o.subtotal.toString(),
      shippingFee: o.shippingFee.toString(),
      discountAmount: o.discountAmount.toString(),
      taxAmount: o.taxAmount.toString(),
      totalAmount: o.totalAmount.toString(),
      currency: o.currency,
      couponCode: o.coupon?.code ?? null,
      notes: o.notes,
      paymentExpiresAt: o.paymentExpiresAt?.toISOString() ?? null,
      paidAt: o.paidAt?.toISOString() ?? null,
      completedAt: o.completedAt?.toISOString() ?? null,
      cancelledAt: o.cancelledAt?.toISOString() ?? null,
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        titleSnapshot: i.titleSnapshot,
        unitPrice: i.unitPrice.toString(),
        quantity: i.quantity,
        lineTotal: i.lineTotal.toString(),
        product: i.product
          ? {
              id: i.product.id,
              slug: i.product.slug,
              title: i.product.title,
              mainImage: i.product.mainImage,
            }
          : null,
      })),
      shipping: o.shipping
        ? {
            recipientName: o.shipping.recipientName,
            recipientPhone: o.shipping.recipientPhone,
            addressLine: o.shipping.addressLine,
            ward: o.shipping.ward,
            district: o.shipping.district,
            province: o.shipping.province,
            postalCode: o.shipping.postalCode,
            carrier: o.shipping.carrier,
            trackingCode: o.shipping.trackingCode,
            shippedAt: o.shipping.shippedAt?.toISOString() ?? null,
            deliveredAt: o.shipping.deliveredAt?.toISOString() ?? null,
          }
        : null,
      payments: o.payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        providerTxnId: p.providerTxnId,
        amount: p.amount.toString(),
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        ipnReceivedAt: p.ipnReceivedAt?.toISOString() ?? null,
      })),
      refundedAmount: o.refundedAmount?.toString() ?? null,
      refundedAt: o.refundedAt?.toISOString() ?? null,
      refundReason: o.refundReason ?? null,
      statusHistory: o.statusHistory.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus as OrderStatus | null,
        toStatus: h.toStatus as OrderStatus,
        note: h.note,
        actorUserId: h.actorUserId,
        createdAt: h.createdAt.toISOString(),
      })),
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }

  private async recordStatusHistory(
    tx: Prisma.TransactionClient,
    orderId: string,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    note?: string,
    actorUserId?: string,
  ) {
    return tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus,
        toStatus,
        note: note ?? null,
        actorUserId: actorUserId ?? null,
      },
    });
  }
}

/**
 * Everything the order-confirmation mail needs, captured inside `markPaid`'s
 * transaction so the send sees exactly the data we just committed.
 */
interface OrderPaidMailContext {
  contactEmail: string;
  firstName: string | null;
  orderNumber: string;
  paidAt: Date;
  isGuest: boolean;
  items: Array<{
    title: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    mainImage: string | null;
  }>;
  subtotal: string;
  discountAmount: string;
  shippingFee: string;
  totalAmount: string;
  shipping: {
    recipientName: string;
    recipientPhone: string;
    addressLine: string;
    ward: string | null;
    district: string | null;
    province: string | null;
  } | null;
  paymentProvider: 'COD' | 'VNPAY' | 'MOMO' | 'CREDIT_CARD';
}

/** VND formatter mirroring `apps/web/src/lib/storefront/format.ts:formatVnd`. */
function formatVnd(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
}

function formatPaymentMethod(provider: 'COD' | 'VNPAY' | 'MOMO' | 'CREDIT_CARD'): string {
  switch (provider) {
    case 'COD':
      return 'Cash on Delivery';
    case 'VNPAY':
      return 'VNPAY';
    case 'MOMO':
      return 'MoMo';
    case 'CREDIT_CARD':
      return 'Credit Card';
  }
}
