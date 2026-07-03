import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import type { PaymentIpnResult, PaymentStatus } from '@ecom/shared';
import { ENV_TOKEN, type AppEnv } from '../../../config/env';
import type { PaymentGateway, PaymentSession } from './gateway.interface';

/**
 * VNPAY (sandbox) integration.
 *
 * Flow:
 *   1. `createSession` builds a signed pay URL and returns it. The buyer's
 *      browser follows the URL to VNPAY, completes payment, and VNPAY does
 *      two things: (a) POSTs an IPN webhook to us, and (b) redirects the
 *      buyer back to `VNPAY_RETURN_URL`.
 *   2. `verifyIpn` validates the HMAC-SHA512 signature over the query params
 *      (sorted alphabetically, excluding `vnp_SecureHash`).
 *
 * Amounts are multiplied by 100 on the wire (VNPAY treats "1" as 0.01 VND).
 * The return URL and IPN both carry the same params — we only trust the IPN
 * for state transitions; the return URL is display-only.
 *
 * Sandbox reference: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */
@Injectable()
export class VnpayGateway implements PaymentGateway {
  readonly provider = 'VNPAY' as const;
  private readonly logger = new Logger(VnpayGateway.name);

  constructor(@Inject(ENV_TOKEN) private readonly env: AppEnv) {}

  async createSession(input: {
    order: { orderNumber: string; totalAmount: { toString(): string } };
    ipAddress?: string;
  }): Promise<PaymentSession> {
    if (!this.env.VNPAY_TMN_CODE || !this.env.VNPAY_HASH_SECRET) {
      throw new InternalServerErrorException({
        code: 'VNPAY_NOT_CONFIGURED',
        message: 'VNPAY credentials are not configured on the server',
      });
    }

    const amount = Math.round(Number(input.order.totalAmount.toString())) * 100;
    const now = new Date();
    const createDate = formatVnpDate(now);
    const expireDate = formatVnpDate(new Date(now.getTime() + 15 * 60_000));

    // The `params` object below is the VNPAY-required set. Keys MUST be sorted
    // alphabetically before signing.
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.env.VNPAY_TMN_CODE,
      vnp_Amount: String(amount),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.order.orderNumber,
      vnp_OrderInfo: `Thanh toan don hang ${input.order.orderNumber}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: this.env.VNPAY_RETURN_URL,
      vnp_IpAddr: input.ipAddress ?? '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const signed = signVnpParams(params, this.env.VNPAY_HASH_SECRET);
    const redirectUrl = `${this.env.VNPAY_URL}?${signed.query}`;

    return {
      redirectUrl,
      providerTxnId: input.order.orderNumber, // We'll get the bank's transactionNo in the IPN.
      rawPayload: { paramsSent: params },
    };
  }

  async verifyIpn(payload: Record<string, unknown>): Promise<PaymentIpnResult> {
    const params = coerceStringMap(payload);
    const receivedHash = (params['vnp_SecureHash'] ?? '').toLowerCase();
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    const { hash: computedHash } = signVnpParams(params, this.env.VNPAY_HASH_SECRET);
    const ok = timingSafeEqualHex(computedHash, receivedHash);

    const responseCode = params['vnp_ResponseCode'] ?? '';
    const transactionStatus = params['vnp_TransactionStatus'] ?? '';
    const providerTxnId = params['vnp_TransactionNo'] ?? params['vnp_TxnRef'] ?? null;
    const amount = params['vnp_Amount']
      ? (Number(params['vnp_Amount']) / 100).toString()
      : '0';
    const orderNumber = params['vnp_TxnRef'] ?? '';

    // VNPAY treats "00" as success for both response + transaction status.
    const success = ok && responseCode === '00' && transactionStatus === '00';
    const status: PaymentStatus = success ? 'SUCCEEDED' : ok ? 'FAILED' : 'FAILED';

    if (!ok) {
      this.logger.warn(`VNPAY signature mismatch for order ${orderNumber}`);
    }

    return {
      provider: 'VNPAY',
      ok: success,
      orderNumber,
      providerTxnId,
      amount,
      resultCode: responseCode,
      status,
      rawPayload: params,
    };
  }
}

function coerceStringMap(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return out;
}

/**
 * VNPAY expects params sorted lexicographically and encoded with strict
 * RFC 3986 rules (spaces as `+` in the query, spec-escape all reserved
 * characters). Their reference impl uses `encodeURIComponent` — matching that
 * lets our signature agree with theirs.
 */
function signVnpParams(
  params: Record<string, string>,
  secret: string,
): { query: string; hash: string } {
  const entries = Object.keys(params)
    .filter((k) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
    .sort()
    .map((k) => [k, params[k] ?? ''] as const);

  const rawQuery = entries.map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
  const hash = crypto
    .createHmac('sha512', secret)
    .update(Buffer.from(rawQuery, 'utf8'))
    .digest('hex');
  return { query: `${rawQuery}&vnp_SecureHash=${hash}`, hash };
}

function enc(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function formatVnpDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}
