import { Controller, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

/**
 * Payment gateway callback endpoints. All are `@Public()` because they're
 * hit by the gateway or the buyer's browser after redirect — there is no
 * user session on these requests. Signature verification inside the gateway
 * is the security boundary.
 *
 * IPN endpoints return provider-specific ack payloads (VNPAY expects
 * `{ RspCode, Message }`; MoMo expects HTTP 204).
 * Return endpoints redirect the browser back to the storefront confirmation
 * page — actual "did payment succeed" comes from the (already-processed)
 * IPN, not from the return URL.
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * VNPAY IPN — server-to-server call from VNPAY. Params are always GET.
   * We respond with `{ RspCode: '00', Message: 'Confirm Success' }` for
   * accepted payloads (regardless of whether payment succeeded — VNPAY only
   * cares that we processed the callback). Any other RspCode instructs VNPAY
   * to retry.
   */
  @Public()
  @Get('vnpay/ipn')
  async vnpayIpn(@Query() query: Record<string, string>) {
    try {
      const result = await this.payments.handleIpn('VNPAY', query);
      return { RspCode: '00', Message: result.ok ? 'Confirm Success' : 'Failed but recorded' };
    } catch (e) {
      const code = (e as { response?: { code?: string } }).response?.code;
      if (code === 'ORDER_NOT_FOUND') return { RspCode: '01', Message: 'Order not found' };
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }

  /**
   * VNPAY return URL. Doesn't update order state (the IPN does that). Just
   * lets us surface a friendly confirmation via redirect back to the store.
   */
  @Public()
  @Get('vnpay/return')
  vnpayReturn(@Query() query: Record<string, string>) {
    return {
      provider: 'VNPAY',
      orderNumber: query['vnp_TxnRef'] ?? null,
      responseCode: query['vnp_ResponseCode'] ?? null,
      transactionStatus: query['vnp_TransactionStatus'] ?? null,
    };
  }

  /** MoMo IPN — MoMo POSTs JSON. */
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('momo/ipn')
  async momoIpn(@Req() req: FastifyRequest) {
    await this.payments.handleIpn('MOMO', (req.body ?? {}) as Record<string, unknown>);
  }

  @Public()
  @Get('momo/return')
  momoReturn(@Query() query: Record<string, string>) {
    return {
      provider: 'MOMO',
      orderId: query.orderId ?? null,
      resultCode: query.resultCode ?? null,
      message: query.message ?? null,
    };
  }
}
