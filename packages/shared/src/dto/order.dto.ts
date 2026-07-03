import { z } from 'zod';

export const OrderStatus = z.enum([
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'EXPIRED',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const PaymentProvider = z.enum(['MOMO', 'VNPAY', 'CREDIT_CARD', 'COD']);
export type PaymentProvider = z.infer<typeof PaymentProvider>;

export const PaymentStatus = z.enum([
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
  'EXPIRED',
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const CouponType = z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']);
export type CouponType = z.infer<typeof CouponType>;

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), schema);

const trimmed = (max: number) => z.string().trim().max(max);

export const ShippingInfoInput = z.object({
  recipientName: trimmed(120).min(1),
  recipientPhone: trimmed(30).min(6),
  addressLine: trimmed(300).min(1),
  ward: emptyToUndef(trimmed(100).optional()),
  district: emptyToUndef(trimmed(100).optional()),
  province: emptyToUndef(trimmed(100).optional()),
  postalCode: emptyToUndef(trimmed(20).optional()),
});
export type ShippingInfoInput = z.infer<typeof ShippingInfoInput>;

export const CreateOrderItemInput = z.object({
  productId: z.string().cuid(),
  variantId: emptyToUndef(z.string().cuid().optional()),
  quantity: z.number().int().positive().max(999),
});
export type CreateOrderItemInput = z.infer<typeof CreateOrderItemInput>;

export const CreateOrderDto = z.object({
  items: z.array(CreateOrderItemInput).min(1).max(50),
  shipping: ShippingInfoInput,
  paymentProvider: PaymentProvider,
  couponCode: emptyToUndef(trimmed(50).min(1).optional()),
  notes: emptyToUndef(trimmed(500).optional()),
  // Required for guest checkout; ignored for authenticated users (server pulls
  // from the JWT-linked user record). Persisted on the order so history stays
  // intact even if a user later changes their account email.
  contactEmail: emptyToUndef(z.string().email().optional()),
});
export type CreateOrderDto = z.infer<typeof CreateOrderDto>;

/**
 * Response from POST /orders/checkout. `redirectUrl` is set for gateway-based
 * providers (VNPAY/MoMo); COD returns no redirect. `token` is present for guest
 * checkouts so /orders/[orderNumber]?token=xxx works without a session.
 */
export interface CheckoutResult {
  orderNumber: string;
  token?: string;
  redirectUrl?: string;
}

export const AdminListOrdersQuery = z.object({
  search: trimmed(200).optional(),
  status: OrderStatus.optional(),
  paymentProvider: PaymentProvider.optional(),
  from: emptyToUndef(z.string().datetime().optional()),
  to: emptyToUndef(z.string().datetime().optional()),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  sortBy: z.enum(['createdAt', 'totalAmount']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type AdminListOrdersQuery = z.infer<typeof AdminListOrdersQuery>;

export const MyOrdersQuery = z.object({
  status: OrderStatus.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
});
export type MyOrdersQuery = z.infer<typeof MyOrdersQuery>;

export const UpdateOrderStatusDto = z.object({
  status: OrderStatus,
  carrier: emptyToUndef(trimmed(100).optional()),
  trackingCode: emptyToUndef(trimmed(100).optional()),
});
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusDto>;

export const RefundOrderDto = z.object({
  reason: trimmed(500).min(1),
});
export type RefundOrderDto = z.infer<typeof RefundOrderDto>;

/**
 * Shape returned to the client on GET /orders/:id and /orders/by-number/:n.
 * `Decimal` fields come through as strings so we don't lose precision through
 * JSON. Prisma returns Decimal instances that JSON.stringify serializes as
 * numeric strings.
 */
export interface OrderItemView {
  id: string;
  productId: string;
  variantId: string | null;
  titleSnapshot: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  product?: {
    id: string;
    slug: string;
    title: string;
    mainImage: string | null;
  } | null;
}

export interface OrderShippingView {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  ward: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  carrier: string | null;
  trackingCode: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface OrderPaymentView {
  id: string;
  provider: PaymentProvider;
  providerTxnId: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  ipnReceivedAt: string | null;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  userId: string | null;
  contactEmail: string | null;
  subtotal: string;
  shippingFee: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  couponCode: string | null;
  notes: string | null;
  paymentExpiresAt: string | null;
  paidAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: OrderItemView[];
  shipping: OrderShippingView | null;
  payments: OrderPaymentView[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedOrders {
  items: OrderView[];
  total: number;
  page: number;
  pageSize: number;
}
