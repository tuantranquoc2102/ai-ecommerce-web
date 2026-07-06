import { Inject, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ENV_TOKEN, type AppEnv } from '../../config/env';
import { orderConfirmationEmail, otpEmail, passwordResetEmail, welcomeEmail } from './templates';

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: Array<{ name: string; value: string }>;
  /** Redis idempotency key — set for critical mails (OTP resend, password reset) so retries during transient failures don't fan out. */
  idempotencyKey?: string;
}

export interface MailResult {
  id: string | null;
  delivered: 'sent' | 'logged';
}

/**
 * Transactional email service backed by Resend.
 *
 * Dev mode: when RESEND_API_KEY is empty, mails are logged to the pino
 * logger instead of hitting the Resend API. That means new developers can
 * clone the repo and exercise password-reset / OTP / order-confirmation
 * flows without an account or burning free-tier credits.
 *
 * Production: swapping providers (Postmark, SES, SendGrid) means writing a
 * new adapter — the consumers depend on this class, not on Resend directly.
 * Callers should NOT construct HTML at the call site; add a template
 * function in `./templates.ts` and expose a helper method here.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;

  constructor(@Inject(ENV_TOKEN) private readonly env: AppEnv) {
    this.resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY not set — mail delivery is DISABLED. Messages will be logged instead of sent. Set RESEND_API_KEY in production.',
      );
    }
  }

  async send(input: SendMailInput): Promise<MailResult> {
    if (!this.resend) {
      this.logger.log(
        {
          mail: {
            to: input.to,
            subject: input.subject,
            preview: input.text?.slice(0, 400) ?? stripTags(input.html).slice(0, 400),
          },
        },
        `[MAIL:DEV] ${input.subject} → ${input.to}`,
      );
      return { id: null, delivered: 'logged' };
    }

    try {
      const res = await this.resend.emails.send({
        from: this.env.MAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: this.env.MAIL_REPLY_TO || undefined,
        tags: input.tags,
        headers: input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : undefined,
      });
      if (res.error) {
        this.logger.error(
          { err: res.error, to: input.to, subject: input.subject },
          'Resend rejected the message',
        );
        throw new Error(`Resend error: ${res.error.message}`);
      }
      return { id: res.data?.id ?? null, delivered: 'sent' };
    } catch (e) {
      this.logger.error({ err: e, to: input.to, subject: input.subject }, 'Failed to deliver mail');
      throw e;
    }
  }

  // ---- typed helpers so callers don't hand-roll HTML ------------------------

  sendOtp(input: { to: string; code: string; ttlSeconds: number }): Promise<MailResult> {
    return this.send({
      to: input.to,
      subject: `${this.env.MAIL_BRAND_NAME} · Your verification code`,
      ...otpEmail({
        brand: this.env.MAIL_BRAND_NAME,
        code: input.code,
        ttlMinutes: Math.max(1, Math.round(input.ttlSeconds / 60)),
      }),
      tags: [{ name: 'category', value: 'otp' }],
    });
  }

  sendPasswordReset(input: { to: string; resetUrl: string; ttlSeconds: number }): Promise<MailResult> {
    return this.send({
      to: input.to,
      subject: `${this.env.MAIL_BRAND_NAME} · Reset your password`,
      ...passwordResetEmail({
        brand: this.env.MAIL_BRAND_NAME,
        resetUrl: input.resetUrl,
        ttlMinutes: Math.max(1, Math.round(input.ttlSeconds / 60)),
      }),
      tags: [{ name: 'category', value: 'password-reset' }],
    });
  }

  sendWelcome(input: { to: string; firstName?: string | null }): Promise<MailResult> {
    return this.send({
      to: input.to,
      subject: `Welcome to ${this.env.MAIL_BRAND_NAME}`,
      ...welcomeEmail({ brand: this.env.MAIL_BRAND_NAME, firstName: input.firstName ?? null }),
      tags: [{ name: 'category', value: 'welcome' }],
    });
  }

  sendOrderConfirmation(input: {
    to: string;
    firstName?: string | null;
    orderNumber: string;
    paidAt: Date;
    items: Array<{
      title: string;
      quantity: number;
      unitPriceFormatted: string;
      lineTotalFormatted: string;
      imageUrl?: string | null;
    }>;
    subtotalFormatted: string;
    discountFormatted: string | null;
    shippingFormatted: string;
    totalFormatted: string;
    shipping: {
      recipientName: string;
      recipientPhone: string;
      addressLine: string;
      ward: string | null;
      district: string | null;
      province: string | null;
    } | null;
    paymentMethod: string;
    viewOrderUrl: string;
  }): Promise<MailResult> {
    return this.send({
      to: input.to,
      subject: `${this.env.MAIL_BRAND_NAME} · Order ${input.orderNumber} confirmed`,
      ...orderConfirmationEmail({
        brand: this.env.MAIL_BRAND_NAME,
        firstName: input.firstName ?? null,
        orderNumber: input.orderNumber,
        paidAt: input.paidAt,
        items: input.items,
        subtotalFormatted: input.subtotalFormatted,
        discountFormatted: input.discountFormatted,
        shippingFormatted: input.shippingFormatted,
        totalFormatted: input.totalFormatted,
        shipping: input.shipping,
        paymentMethod: input.paymentMethod,
        viewOrderUrl: input.viewOrderUrl,
      }),
      tags: [
        { name: 'category', value: 'order-confirmation' },
        { name: 'orderNumber', value: input.orderNumber },
      ],
      // Prevent double-send if `markPaid` runs twice for the same order for
      // any reason (crash + gateway retry, etc.).
      idempotencyKey: `order-confirmation:${input.orderNumber}`,
    });
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
