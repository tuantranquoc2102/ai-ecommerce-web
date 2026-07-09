'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  Separator,
  Textarea,
  useToast,
} from '@ecom/ui';
import type {
  OrderStatus,
  OrderView,
  RefundOrderDto,
  UpdateOrderStatusDto,
  UpdateShippingDto,
} from '@ecom/shared';
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
  const [savingShipping, setSavingShipping] = useState(false);

  // Refund dialog state.
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundRestock, setRefundRestock] = useState(true);
  const [refunding, setRefunding] = useState(false);

  const applyOrder = useCallback((result: OrderView) => {
    setOrder(result);
    setCarrier(result.shipping?.carrier ?? '');
    setTrackingCode(result.shipping?.trackingCode ?? '');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<OrderView>(`/orders/${id}`);
      applyOrder(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, applyOrder]);

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
      applyOrder(result);
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

  async function saveShipping() {
    setSavingShipping(true);
    try {
      const body: UpdateShippingDto = {
        carrier: carrier || undefined,
        trackingCode: trackingCode || undefined,
      };
      const result = await apiFetch<OrderView>(`/orders/${id}/shipping`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      applyOrder(result);
      toast({ title: 'Shipping updated', variant: 'success' });
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSavingShipping(false);
    }
  }

  async function submitRefund() {
    if (!refundReason.trim()) return;
    setRefunding(true);
    try {
      const amount = refundAmount.trim();
      const body: RefundOrderDto = {
        reason: refundReason.trim(),
        restock: refundRestock,
        ...(amount ? { amount } : {}),
      };
      const result = await apiFetch<OrderView>(`/orders/${id}/refund`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      applyOrder(result);
      toast({ title: 'Order refunded', variant: 'success' });
      setRefundOpen(false);
      setRefundReason('');
      setRefundAmount('');
      setRefundRestock(true);
    } catch (e) {
      toast({
        title: 'Refund failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setRefunding(false);
    }
  }

  const history = useMemo(
    () =>
      (order?.statusHistory ?? [])
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [order],
  );

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
  const statusTransitions = nextStates.filter((s) => s !== 'REFUNDED');
  const canRefund = nextStates.includes('REFUNDED');

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
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Shipping</h2>
              <Button size="sm" variant="outline" onClick={saveShipping} disabled={savingShipping}>
                {savingShipping ? <Loader2 className="size-4 animate-spin" /> : null}
                Save shipping
              </Button>
            </div>
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

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Status timeline</h2>
            <Separator className="my-3" />
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status changes recorded.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {h.fromStatus ? (
                          <>
                            <Badge variant={STATUS_VARIANT[h.fromStatus]} className="text-[10px]">
                              {h.fromStatus}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                          </>
                        ) : null}
                        <Badge variant={STATUS_VARIANT[h.toStatus]} className="text-[10px]">
                          {h.toStatus}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {h.note ? (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{h.note}</p>
                      ) : null}
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
              {order.userId ? (
                <Button variant="outline" size="sm" asChild className="mt-3">
                  <Link href={`/admin/customers/${order.userId}` as Route}>View customer</Link>
                </Button>
              ) : null}
            </div>
          </Card>

          {order.refundedAt ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Refund</h2>
              <Separator className="my-3" />
              <dl className="space-y-1 text-sm">
                <Row
                  label="Refunded"
                  value={order.refundedAmount ? formatVnd(order.refundedAmount) : '—'}
                  bold
                />
                <div className="text-muted-foreground">
                  {new Date(order.refundedAt).toLocaleString()}
                </div>
                {order.refundReason ? (
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {order.refundReason}
                  </p>
                ) : null}
              </dl>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Update status</h2>
            <Separator className="my-3" />
            {statusTransitions.length === 0 && !canRefund ? (
              <p className="text-sm text-muted-foreground">This order is in a terminal state.</p>
            ) : (
              <div className="grid gap-2">
                {statusTransitions.map((next) => (
                  <Button
                    key={next}
                    variant={next === 'CANCELLED' ? 'outline' : 'default'}
                    disabled={saving !== null}
                    onClick={() => transition(next)}
                  >
                    {saving === next ? <Loader2 className="size-4 animate-spin" /> : null}
                    Mark as {next}
                  </Button>
                ))}
                {canRefund ? (
                  <Button variant="outline" onClick={() => setRefundOpen(true)}>
                    Refund…
                  </Button>
                ) : null}
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

      <Dialog open={refundOpen} onOpenChange={(o) => (!refunding ? setRefundOpen(o) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund order</DialogTitle>
            <DialogDescription>
              Refund {order.orderNumber}. This transitions the order to REFUNDED.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="refund-reason">Reason</Label>
              <Textarea
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Why is this order being refunded?"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="refund-amount">Amount</Label>
              <Input
                id="refund-amount"
                inputMode="decimal"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="full amount"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to refund the full order total.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={refundRestock}
                onCheckedChange={(v) => setRefundRestock(v === true)}
              />
              Return refunded items to inventory
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={refunding}>
              Cancel
            </Button>
            <Button onClick={submitRefund} disabled={refunding || !refundReason.trim()}>
              {refunding ? <Loader2 className="size-4 animate-spin" /> : null}
              Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
