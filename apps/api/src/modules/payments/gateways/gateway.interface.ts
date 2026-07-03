import type { Order, Payment } from '@prisma/client';
import type { PaymentProvider, PaymentIpnResult } from '@ecom/shared';

export interface PaymentSession {
  /** Where to redirect the buyer's browser. Null for COD (no redirect). */
  redirectUrl: string | null;
  /** Gateway's own reference (used to correlate the IPN webhook). */
  providerTxnId: string | null;
  /** Anything the gateway hands back at session creation — persisted for audit. */
  rawPayload: Record<string, unknown> | null;
}

/**
 * Common gateway contract. Every provider (COD, VNPAY, MoMo, future
 * CREDIT_CARD) implements two operations:
 *   - `createSession` at checkout time to hand the shopper somewhere to pay
 *   - `verifyIpn` at webhook time to authoritatively confirm the payment
 *
 * The IPN is the source of truth; return URLs are display-only.
 */
export interface PaymentGateway {
  readonly provider: PaymentProvider;

  createSession(input: {
    order: Order;
    payment: Payment;
    ipAddress?: string;
  }): Promise<PaymentSession>;

  /**
   * Verifies the signature/authenticity of an incoming IPN payload and returns
   * a normalized result. Throws only for malformed/unverifiable payloads.
   * Downstream logic reads `ok` to decide whether to mark the order paid.
   */
  verifyIpn(payload: Record<string, unknown>): Promise<PaymentIpnResult>;
}
