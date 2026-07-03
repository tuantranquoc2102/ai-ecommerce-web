import type {
  CheckoutResult,
  CreateOrderDto,
  MyOrdersQuery,
  OrderView,
  PaginatedOrders,
} from '@ecom/shared';
import { apiFetch } from '../api-client';

/**
 * Storefront-facing client for the orders API. Uses `apiFetch` (auto-attaches
 * JWT when the customer is logged in; sends anonymous otherwise). Guest
 * confirmation lookups pass the Redis-issued token in the query string.
 */

export function checkout(dto: CreateOrderDto): Promise<CheckoutResult> {
  return apiFetch<CheckoutResult>('/orders/checkout', {
    method: 'POST',
    body: JSON.stringify(dto),
    auth: false, // OptionalAuth on the server — send anonymously by default.
  });
}

/** Same as `checkout`, but attaches the Bearer token if present. */
export function checkoutAsCustomer(dto: CreateOrderDto): Promise<CheckoutResult> {
  return apiFetch<CheckoutResult>('/orders/checkout', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function getOrderByNumber(
  orderNumber: string,
  token?: string,
): Promise<OrderView> {
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return apiFetch<OrderView>(`/orders/by-number/${encodeURIComponent(orderNumber)}${qs}`, {
    auth: !!token ? false : true,
  });
}

export function listMyOrders(query: MyOrdersQuery = { page: 1, pageSize: 10 }): Promise<PaginatedOrders> {
  const qs = new URLSearchParams();
  if (query.status) qs.set('status', query.status);
  if (query.page) qs.set('page', String(query.page));
  if (query.pageSize) qs.set('pageSize', String(query.pageSize));
  return apiFetch<PaginatedOrders>(`/orders/me?${qs.toString()}`);
}

export function getMyOrderByNumber(orderNumber: string): Promise<OrderView> {
  return apiFetch<OrderView>(`/orders/me/${encodeURIComponent(orderNumber)}`);
}
