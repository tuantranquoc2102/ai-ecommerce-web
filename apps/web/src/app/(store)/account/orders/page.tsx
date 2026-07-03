'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PackageOpen, ShoppingBag } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Skeleton } from '@ecom/ui';
import type { OrderStatus, PaginatedOrders } from '@ecom/shared';
import { ApiError } from '@/lib/api-client';
import { listMyOrders } from '@/lib/storefront/order-api';
import { useCurrentCustomer } from '@/lib/storefront/current-user-hook';
import { formatVnd } from '@/lib/storefront/format';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  EXPIRED: 'Expired',
};

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  PAID: 'default',
  PROCESSING: 'default',
  SHIPPING: 'default',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
  REFUNDED: 'destructive',
  EXPIRED: 'destructive',
};

export default function MyOrdersPage() {
  const { user, loading: userLoading } = useCurrentCustomer();
  const router = useRouter();
  const [data, setData] = useState<PaginatedOrders | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/account/login?next=/account/orders');
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (userLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await listMyOrders({ page: 1, pageSize: 20 });
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load orders.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Your orders</h1>

      {loading || userLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="No orders yet"
          description="Anything you buy will show up here."
          action={
            <Button asChild>
              <Link href="/products">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.items.map((order) => (
            <li key={order.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                  <PackageOpen className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link
                      href={`/orders/${order.orderNumber}`}
                      className="font-mono text-sm font-semibold hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <Badge variant={STATUS_VARIANT[order.status]} className="text-[10px]">
                      {STATUS_LABEL[order.status]}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item{order.items.length === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="text-right text-sm font-semibold">
                  {formatVnd(order.totalAmount)}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
