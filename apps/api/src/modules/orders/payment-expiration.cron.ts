import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

/**
 * Sweeps PENDING orders past their `paymentExpiresAt` timestamp every minute.
 * The sweep transitions each to `EXPIRED` and releases the reserved stock —
 * so abandoned VNPAY/MoMo sessions don't hold inventory forever.
 *
 * A single sweep processes at most 100 orders (see `OrdersService.expirePending`);
 * if the queue exceeds that, subsequent minutes catch up.
 */
@Injectable()
export class PaymentExpirationCron {
  private readonly logger = new Logger(PaymentExpirationCron.name);

  constructor(private readonly orders: OrdersService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep(): Promise<void> {
    try {
      const count = await this.orders.expirePending();
      if (count > 0) {
        this.logger.log(`Expired ${count} stale pending order(s)`);
      }
    } catch (e) {
      this.logger.error(`Sweep failed: ${(e as Error).message}`);
    }
  }
}
