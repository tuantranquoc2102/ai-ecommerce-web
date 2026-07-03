import { Injectable, NotImplementedException } from '@nestjs/common';
import type { PaymentGateway, PaymentSession } from './gateway.interface';

/**
 * Cash-on-Delivery "gateway". Nothing external happens at checkout — the
 * order sits in PENDING and the admin manually transitions it via
 * PATCH /orders/:id/status once the courier confirms delivery.
 *
 * COD has no IPN; the admin's status update is the confirmation.
 */
@Injectable()
export class CodGateway implements PaymentGateway {
  readonly provider = 'COD' as const;

  async createSession(): Promise<PaymentSession> {
    return { redirectUrl: null, providerTxnId: null, rawPayload: null };
  }

  async verifyIpn(): Promise<never> {
    throw new NotImplementedException({
      code: 'COD_NO_IPN',
      message: 'COD orders do not receive IPN webhooks',
    });
  }
}
