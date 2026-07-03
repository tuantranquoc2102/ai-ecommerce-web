'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, Loader2, PackageCheck } from 'lucide-react';
import { Alert, AlertDescription, Badge, Button, Card, Separator } from '@ecom/ui';
import type { OrderStatus, OrderView } from '@ecom/shared';
import { ApiError } from '@/lib/api-client';
import { getOrderByNumber } from '@/lib/storefront/order-api';
import { formatVnd } from '@/lib/storefront/format';

/**
 * Order confirmation page. Works for both guest (via ?token=xxx) and
 * authenticated customers (falls back to /orders/me/:orderNumber). Polls the
 * status once on mount — for VNPAY/MoMo the IPN may still be in-flight when
 * the buyer lands here so the page shows "Waiting for confirmation" with a
 * retry hint. COD orders show "Order received".
 */
export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);
  const search = useSearchParams();
  const token = search.get('token') ?? undefined;
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getOrderByNumber(orderNumber, token);
        if (!cancelled) setOrder(result);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Order not found.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto size-6 animate-spin" />
      </div>
    );
  }

  if (!order || error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error ?? 'We could not find that order.'}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">Back to storefront</Link>
        </Button>
      </div>
    );
  }

  const hero = orderHero(order);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className={`flex size-12 items-center justify-center rounded-full ${hero.bgClass}`}
          >
            <hero.Icon className="size-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{hero.title}</h1>
          <p className="max-w-lg text-sm text-muted-foreground">{hero.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Order number <span className="font-mono font-semibold text-foreground">{order.orderNumber}</span>
          </p>
          <StatusBadge status={order.status} />
        </div>

        <Separator className="my-6" />

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold">Items</h2>
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.product?.mainImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.mainImage} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="line-clamp-2 font-medium">{item.titleSnapshot}</div>
                    <div className="text-muted-foreground">
                      {item.quantity} × {formatVnd(item.unitPrice)}
                    </div>
                  </div>
                  <div className="text-right text-xs font-semibold">
                    {formatVnd(item.lineTotal)}
                  </div>
                </li>
              ))}
            </ul>

            <Separator className="my-4" />

            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatVnd(order.subtotal)}</dd>
              </div>
              {Number(order.discountAmount) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="text-emerald-600">−{formatVnd(order.discountAmount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{formatVnd(order.shippingFee)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-sm font-semibold">
                <dt>Total</dt>
                <dd>{formatVnd(order.totalAmount)}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4 text-xs">
            {order.shipping ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold">Shipping to</h2>
                <div className="text-muted-foreground">
                  <div className="text-foreground">{order.shipping.recipientName}</div>
                  <div>{order.shipping.recipientPhone}</div>
                  <div>{order.shipping.addressLine}</div>
                  <div>
                    {[order.shipping.ward, order.shipping.district, order.shipping.province]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {order.shipping.trackingCode ? (
                    <div className="mt-2">
                      Tracking: <span className="font-mono">{order.shipping.trackingCode}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div>
              <h2 className="mb-2 text-sm font-semibold">Payment</h2>
              <div className="space-y-1 text-muted-foreground">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span>{p.provider}</span>
                    <Badge variant={p.status === 'SUCCEEDED' ? 'default' : 'secondary'} className="text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </Card>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild variant="outline">
          <Link href="/products">Continue shopping</Link>
        </Button>
        <Button asChild>
          <Link href="/account/orders">View my orders</Link>
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    PENDING: { variant: 'secondary', label: 'Awaiting payment' },
    PAID: { variant: 'default', label: 'Paid' },
    PROCESSING: { variant: 'default', label: 'Processing' },
    SHIPPING: { variant: 'default', label: 'Shipping' },
    COMPLETED: { variant: 'default', label: 'Completed' },
    CANCELLED: { variant: 'destructive', label: 'Cancelled' },
    REFUNDED: { variant: 'destructive', label: 'Refunded' },
    EXPIRED: { variant: 'destructive', label: 'Expired' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function orderHero(order: OrderView): {
  title: string;
  description: string;
  Icon: typeof CheckCircle2;
  bgClass: string;
} {
  const isCod = order.payments.some((p) => p.provider === 'COD');
  if (order.status === 'PENDING' && isCod) {
    return {
      title: 'Order received',
      description:
        'We\'ve got your order and will contact you shortly to confirm delivery. Cash on delivery — pay when your package arrives.',
      Icon: PackageCheck,
      bgClass: 'bg-emerald-100 text-emerald-700',
    };
  }
  if (order.status === 'PENDING') {
    return {
      title: 'Waiting for payment',
      description:
        'We haven\'t received confirmation from the payment gateway yet. This usually takes a few seconds — refresh the page in a moment.',
      Icon: Clock,
      bgClass: 'bg-amber-100 text-amber-700',
    };
  }
  if (order.status === 'CANCELLED' || order.status === 'EXPIRED' || order.status === 'REFUNDED') {
    return {
      title: 'Order not completed',
      description: 'This order can\'t be processed. Please try again or contact support.',
      Icon: AlertCircle,
      bgClass: 'bg-red-100 text-red-700',
    };
  }
  return {
    title: 'Payment received',
    description: 'Thanks for your order! You\'ll receive updates as we prepare and ship your items.',
    Icon: CheckCircle2,
    bgClass: 'bg-emerald-100 text-emerald-700',
  };
}
