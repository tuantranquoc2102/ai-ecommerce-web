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
import { OrdersService } from '../orders/orders.service';
import { CodGateway } from './gateways/cod.gateway';
import { VnpayGateway } from './gateways/vnpay.gateway';
import { MomoGateway } from './gateways/momo.gateway';
import type { PaymentGateway, PaymentSession } from './gateways/gateway.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly gateways: Record<PaymentProvider, PaymentGateway>;

  constructor(
    private readonly prisma: PrismaService,
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
   * Handles an incoming IPN webhook. Verifies the signature, updates the
   * Payment row, and on success marks the order PAID + consumes reserved
   * stock. Idempotent — a repeat IPN for a fully-processed order just
   * returns the same result without re-running side effects.
   */
  async handleIpn(
    provider: PaymentProvider,
    payload: Record<string, unknown>,
  ): Promise<PaymentIpnResult> {
    const gateway = this.gateways[provider];
    const result = await gateway.verifyIpn(payload);

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
