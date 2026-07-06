import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  PASSWORD_RESET_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  TWOFA_ISSUER: z.string().default('EcomCMS'),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),
  FACEBOOK_CLIENT_ID: z.string().optional().default(''),
  FACEBOOK_CLIENT_SECRET: z.string().optional().default(''),
  FACEBOOK_CALLBACK_URL: z.string().optional().default(''),

  FRONTEND_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_URL: z.string().url(),

  ORDER_PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(15),
  ORDER_NUMBER_PREFIX: z.string().min(1).max(10).default('ECOM'),

  // Resend transactional email. Leave RESEND_API_KEY empty in local dev — the
  // MailService will log messages to the console instead of hitting the API.
  RESEND_API_KEY: z.string().optional().default(''),
  MAIL_FROM: z.string().default('Ecom Store <no-reply@example.com>'),
  MAIL_REPLY_TO: z.string().optional().default(''),
  MAIL_BRAND_NAME: z.string().default('Ecom Store'),

  VNPAY_TMN_CODE: z.string().optional().default(''),
  VNPAY_HASH_SECRET: z.string().optional().default(''),
  VNPAY_URL: z.string().optional().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNPAY_RETURN_URL: z.string().optional().default('http://localhost:3000/checkout/return/vnpay'),

  MOMO_PARTNER_CODE: z.string().optional().default(''),
  MOMO_ACCESS_KEY: z.string().optional().default(''),
  MOMO_SECRET_KEY: z.string().optional().default(''),
  MOMO_CREATE_URL: z.string().optional().default('https://test-payment.momo.vn/v2/gateway/api/create'),
  MOMO_RETURN_URL: z.string().optional().default('http://localhost:3000/checkout/return/momo'),
  MOMO_IPN_URL: z.string().optional().default('http://localhost:4000/api/v1/payments/momo/ipn'),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const ENV_TOKEN = 'APP_ENV';
