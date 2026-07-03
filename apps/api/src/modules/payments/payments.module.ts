import { forwardRef, Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CodGateway } from './gateways/cod.gateway';
import { VnpayGateway } from './gateways/vnpay.gateway';
import { MomoGateway } from './gateways/momo.gateway';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService, CodGateway, VnpayGateway, MomoGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}
