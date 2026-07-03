'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Separator,
  useToast,
} from '@ecom/ui';
import type { OrderStatus, OrderView, UpdateOrderStatusDto } from '@ecom/shared';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatVnd } from '@/lib/storefront/format';

/**
 * Allowed next-state transitions. Mirrors the server-side state machine so the
 * UI only shows buttons the backend will accept. COD orders can skip PENDING →
 * PAID via a shortcut (PROCESSING triggers the auto-promotion server-side).
 */
const NEXT_STATES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPING', 'CANCELLED', 'REFUNDED'],
  SHIPPING: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  EXPIRED: [],
};

const STATUS_VARIANT: Record<OrderStatus, 'secondary' | 'success' | 'destructive' | 'outline' | 'default'> = {
  PENDING: 'secondary',
  PAID: 'success',
  PROCESSING: 'default',
  SHIPPING: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  REFUNDED: 'destructive',
  EXPIRED: 'outline',
};

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<OrderStatus | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<OrderView>(`/orders/${id}`);
      setOrder(result);
      setCarrier(result.shipping?.carrier ?? '');
      setTrackingCode(result.shipping?.trackingCode ?? '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function transition(next: OrderStatus) {
    setSaving(next);
    try {
      const body: UpdateOrderStatusDto = { status: next };
      if (next === 'SHIPPING') {
        body.carrier = carrier || undefined;
        body.trackingCode = trackingCode || undefined;
      }
      const result = await apiFetch<OrderView>(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setOrder(result);
      toast({ title: `Order → ${next}`, variant: 'success' });
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="size-4" />
            Back to orders
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error ?? 'Order not found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const nextStates = NEXT_STATES[order.status];

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/admin/orders">
          <ArrowLeft className="size-4" />
          Orders
        </Link>
      </Button>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono">{order.orderNumber}</span>
            <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
          </span>
        }
        description={`Placed ${new Date(order.createdAt).toLocaleString()} · ${formatVnd(order.totalAmount)}`}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Items</h2>
            <Separator className="my-3" />
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.product?.mainImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.mainImage} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.titleSnapshot}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity} × {formatVnd(item.unitPrice)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{formatVnd(item.lineTotal)}</div>
                </li>
              ))}
            </ul>
            <Separator className="my-4" />
            <dl className="space-y-1 text-sm">
              <Row label="Subtotal" value={formatVnd(order.subtotal)} />
              {Number(order.discountAmount) > 0 ? (
                <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`−${formatVnd(order.discountAmount)}`} />
              ) : null}
              <Row label="Shipping" value={formatVnd(order.shippingFee)} />
              {Number(order.taxAmount) > 0 ? (
                <Row label="Tax" value={formatVnd(order.taxAmount)} />
              ) : null}
              <Separator className="my-2" />
              <Row label="Total" value={formatVnd(order.totalAmount)} bold />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Shipping</h2>
            <Separator className="my-3" />
            {order.shipping ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="text-sm">
                  <div className="font-medium">{order.shipping.recipientName}</div>
                  <div className="text-muted-foreground">{order.shipping.recipientPhone}</div>
                  <div className="text-muted-foreground">{order.shipping.addressLine}</div>
                  <div className="text-muted-foreground">
                    {[order.shipping.ward, order.shipping.district, order.shipping.province]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="carrier" className="text-xs">Carrier</Label>
                    <Input
                      id="carrier"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="e.g. GHTK"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tracking" className="text-xs">Tracking code</Label>
                    <Input
                      id="tracking"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="Enter tracking number"
                    />
                  </div>
                  {order.shipping.shippedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Shipped {new Date(order.shipping.shippedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No shipping info recorded.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Payment history</h2>
            <Separator className="my-3" />
            {order.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment records yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{p.provider}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.providerTxnId ?? '(no txn id)'} · {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatVnd(p.amount)}</div>
                      <Badge
                        variant={p.status === 'SUCCEEDED' ? 'success' : p.status === 'PENDING' ? 'secondary' : 'destructive'}
                        className="text-[10px]"
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {order.notes ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Notes</h2>
              <Separator className="my-3" />
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.notes}</p>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Customer</h2>
            <Separator className="my-3" />
            <div className="text-sm">
              <div className="text-muted-foreground">Contact</div>
              <div className="font-medium">{order.contactEmail ?? '—'}</div>
              <div className="mt-2 text-muted-foreground">Type</div>
              <div>{order.userId ? 'Registered customer' : 'Guest checkout'}</div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Update status</h2>
            <Separator className="my-3" />
            {nextStates.length === 0 ? (
              <p className="text-sm text-muted-foreground">This order is in a terminal state.</p>
            ) : (
              <div className="grid gap-2">
                {nextStates.map((next) => (
                  <Button
                    key={next}
                    variant={next === 'CANCELLED' || next === 'REFUNDED' ? 'outline' : 'default'}
                    disabled={saving !== null}
                    onClick={() => transition(next)}
                  >
                    {saving === next ? <Loader2 className="size-4 animate-spin" /> : null}
                    Mark as {next}
                  </Button>
                ))}
              </div>
            )}
            {order.paymentExpiresAt && order.status === 'PENDING' ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Expires {new Date(order.paymentExpiresAt).toLocaleString()}
              </p>
            ) : null}
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-base font-semibold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
