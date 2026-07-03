import type { PaymentProvider, PaymentStatus } from './order.dto';

/**
 * Common shape returned to the caller after a payment IPN is verified.
 * Provider-specific quirks live inside the gateway; downstream code only
 * cares about "was this the truth, and did it pass".
 */
export interface PaymentIpnResult {
  provider: PaymentProvider;
  ok: boolean;
  orderNumber: string;
  providerTxnId: string | null;
  amount: string;
  resultCode: string;
  status: PaymentStatus;
  rawPayload: Record<string, unknown>;
}
