import { forwardRef, Module } from '@nestjs/common';
import { CouponsModule } from '../coupons/coupons.module';
import { PaymentsModule } from '../payments/payments.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderTokensService } from './order-tokens.service';
import { PaymentExpirationCron } from './payment-expiration.cron';

@Module({
  imports: [CouponsModule, PromotionsModule, forwardRef(() => PaymentsModule)],
  controllers: [OrdersController],
  providers: [OrdersService, OrderTokensService, PaymentExpirationCron],
  exports: [OrdersService],
})
export class OrdersModule {}
