import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Order } from '@prisma/client';
import type { PaymentProvider, PaymentIpnResult } from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { OrdersService } from '../orders/orders.service';
import { CodGateway } from './gateways/cod.gateway';
import { VnpayGateway } from './gateways/vnpay.gateway';
import { MomoGateway } from './gateways/momo.gateway';
import type { PaymentGateway, PaymentSession } from './gateways/gateway.interface';

const IPN_IDEMPOTENCY_TTL = 60 * 60 * 24; // 24h — comfortably longer than any gateway's retry window.

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly gateways: Record<PaymentProvider, PaymentGateway>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
    cod: CodGateway,
    vnpay: VnpayGateway,
    momo: MomoGateway,
  ) {
    this.gateways = {
      COD: cod,
      VNPAY: vnpay,
      MOMO: momo,
      CREDIT_CARD: momo, // placeholder — CREDIT_CARD unused in M3.3
    };
  }

  /**
   * Called at order-creation time. Inserts a PENDING Payment row and hands
   * off to the provider's gateway to create the redirect URL.
   */
  async startSession(order: Order, provider: PaymentProvider, ipAddress?: string): Promise<PaymentSession> {
    const gateway = this.gateways[provider];
    if (!gateway) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_PAYMENT_PROVIDER',
        message: `Provider ${provider} is not supported`,
      });
    }
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider,
        amount: order.totalAmount,
        currency: order.currency,
        status: 'PENDING',
      },
    });
    const session = await gateway.createSession({ order, payment, ipAddress });
    if (session.providerTxnId || session.rawPayload) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerTxnId: session.providerTxnId,
          rawPayload: session.rawPayload
            ? (session.rawPayload as unknown as import('@prisma/client').Prisma.InputJsonValue)
            : undefined,
        },
      });
    }
    return session;
  }

  /**
   * Handles an incoming IPN webhook. Signature is verified first (no side
   * effects). We then acquire a Redis SETNX lock keyed on the gateway's
   * transaction id so that a retried webhook — the same gateway retrying,
   * two load-balanced pods racing, or an attacker replaying — cannot double-
   * process the same event. On the retry path we replay the cached result
   * so the gateway sees a deterministic ack.
   */
  async handleIpn(
    provider: PaymentProvider,
    payload: Record<string, unknown>,
  ): Promise<PaymentIpnResult> {
    const gateway = this.gateways[provider];
    const result = await gateway.verifyIpn(payload);

    // Idempotency key falls back to (orderNumber, resultCode) when the
    // gateway didn't provide a transaction id — e.g. FAILED IPNs from VNPAY.
    const idempotencyId = result.providerTxnId ?? `${result.orderNumber}:${result.resultCode}`;
    const idempotencyKey = `ipn:${provider}:${idempotencyId}`;

    const claimed = await this.redis.setNxEx(
      idempotencyKey,
      IPN_IDEMPOTENCY_TTL,
      JSON.stringify(result),
    );
    if (!claimed) {
      const cached = await this.redis.get(idempotencyKey);
      this.logger.log(`Duplicate IPN ${provider} txn=${idempotencyId} — returning cached result`);
      if (cached) {
        try {
          return JSON.parse(cached) as PaymentIpnResult;
        } catch {
          // Corrupt cache — fall through and reprocess.
        }
      }
      return result;
    }

    const order = await this.prisma.order.findUnique({
      where: { orderNumber: result.orderNumber },
    });
    if (!order) {
      this.logger.warn(`IPN received for unknown order ${result.orderNumber}`);
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }

    // Persist the IPN payload on the matching Payment row regardless of
    // outcome — useful for troubleshooting even when signatures fail.
    const payment = await this.prisma.payment.findFirst({
      where: { orderId: order.id, provider },
      orderBy: { createdAt: 'desc' },
    });
    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: result.status,
          providerTxnId: result.providerTxnId ?? payment.providerTxnId,
          ipnReceivedAt: new Date(),
          rawPayload: result.rawPayload as unknown as import('@prisma/client').Prisma.InputJsonValue,
        },
      });
    }

    if (result.ok && order.status === 'PENDING') {
      await this.orders.markPaid(order.id, result.providerTxnId ?? undefined);
    }

    return result;
  }
}
