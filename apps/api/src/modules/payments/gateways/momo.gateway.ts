import {
  BadGatewayException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { PaymentIpnResult, PaymentStatus } from '@ecom/shared';
import { ENV_TOKEN, type AppEnv } from '../../../config/env';
import type { PaymentGateway, PaymentSession } from './gateway.interface';

/**
 * MoMo (sandbox) integration — `captureWallet` request type.
 *
 * Flow:
 *   1. `createSession` POSTs a signed JSON payload to MoMo's create endpoint.
 *      MoMo responds with a `payUrl`; we return that as the redirect URL.
 *   2. MoMo POSTs an IPN to our `/payments/momo/ipn` endpoint upon completion.
 *      `verifyIpn` recomputes the HMAC-SHA256 signature over the sorted
 *      canonical params and checks it matches.
 *
 * Sandbox reference: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/
 */
@Injectable()
export class MomoGateway implements PaymentGateway {
  readonly provider = 'MOMO' as const;
  private readonly logger = new Logger(MomoGateway.name);

  constructor(@Inject(ENV_TOKEN) private readonly env: AppEnv) {}

  async createSession(input: {
    order: { orderNumber: string; totalAmount: { toString(): string } };
  }): Promise<PaymentSession> {
    if (!this.env.MOMO_PARTNER_CODE || !this.env.MOMO_ACCESS_KEY || !this.env.MOMO_SECRET_KEY) {
      throw new InternalServerErrorException({
        code: 'MOMO_NOT_CONFIGURED',
        message: 'MoMo credentials are not configured on the server',
      });
    }

    const amount = Math.round(Number(input.order.totalAmount.toString()));
    const orderId = `${input.order.orderNumber}-${Date.now()}`; // MoMo requires uniqueness on retries
    const requestId = orderId;
    const orderInfo = `Thanh toan don hang ${input.order.orderNumber}`;
    const requestType = 'captureWallet';
    const extraData = '';
    const redirectUrl = this.env.MOMO_RETURN_URL;
    const ipnUrl = this.env.MOMO_IPN_URL;

    const rawSignature =
      `accessKey=${this.env.MOMO_ACCESS_KEY}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${this.env.MOMO_PARTNER_CODE}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', this.env.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode: this.env.MOMO_PARTNER_CODE,
      accessKey: this.env.MOMO_ACCESS_KEY,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'en',
    };

    const res = await fetch(this.env.MOMO_CREATE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      this.logger.error(`MoMo create-payment HTTP ${res.status}: ${await res.text()}`);
      throw new BadGatewayException({
        code: 'MOMO_CREATE_FAILED',
        message: 'MoMo did not accept the payment request',
      });
    }
    const payload = (await res.json()) as {
      resultCode: number;
      message: string;
      payUrl?: string;
      requestId?: string;
    };
    if (payload.resultCode !== 0 || !payload.payUrl) {
      this.logger.error(`MoMo error resultCode=${payload.resultCode} message=${payload.message}`);
      throw new BadGatewayException({
        code: 'MOMO_REJECTED',
        message: `MoMo rejected the payment request: ${payload.message}`,
      });
    }

    return {
      redirectUrl: payload.payUrl,
      providerTxnId: payload.requestId ?? orderId,
      rawPayload: { requestBody: body, response: payload },
    };
  }

  async verifyIpn(payload: Record<string, unknown>): Promise<PaymentIpnResult> {
    const p = coerceStringMap(payload);
    const receivedSig = (p.signature ?? '').toLowerCase();

    // MoMo IPN signature canonical field order (per docs).
    const rawSignature =
      `accessKey=${this.env.MOMO_ACCESS_KEY}` +
      `&amount=${p.amount ?? ''}` +
      `&extraData=${p.extraData ?? ''}` +
      `&message=${p.message ?? ''}` +
      `&orderId=${p.orderId ?? ''}` +
      `&orderInfo=${p.orderInfo ?? ''}` +
      `&orderType=${p.orderType ?? ''}` +
      `&partnerCode=${p.partnerCode ?? ''}` +
      `&payType=${p.payType ?? ''}` +
      `&requestId=${p.requestId ?? ''}` +
      `&responseTime=${p.responseTime ?? ''}` +
      `&resultCode=${p.resultCode ?? ''}` +
      `&transId=${p.transId ?? ''}`;

    const computedSig = crypto
      .createHmac('sha256', this.env.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest('hex');

    const sigOk = timingSafeEqualHex(computedSig, receivedSig);
    const resultCode = p.resultCode ?? '';
    const success = sigOk && resultCode === '0';
    const status: PaymentStatus = success ? 'SUCCEEDED' : 'FAILED';

    if (!sigOk) {
      this.logger.warn(`MoMo signature mismatch for orderId=${p.orderId}`);
    }

    // The orderId we send to MoMo has a `-<timestamp>` suffix; strip it to
    // recover the internal orderNumber.
    const orderNumber = (p.orderId ?? '').replace(/-\d+$/, '');

    return {
      provider: 'MOMO',
      ok: success,
      orderNumber,
      providerTxnId: p.transId ?? p.requestId ?? null,
      amount: p.amount ?? '0',
      resultCode,
      status,
      rawPayload: p,
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

function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}
