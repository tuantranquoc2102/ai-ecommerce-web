'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, Button, Card } from '@ecom/ui';
import type { OrderView } from '@ecom/shared';
import { ApiError } from '@/lib/api-client';
import { getOrderByNumber } from '@/lib/storefront/order-api';

/**
 * Landing page after a VNPAY/MoMo redirect. Payment truth comes from the IPN
 * (server-to-server); this page just polls the order status a couple of times
 * to close the race between the IPN and the browser redirect, then shows the
 * final state.
 *
 * Guest checkouts don't have a session, so guests won't have a token in this
 * URL (VNPAY only passes back its own params). We fall back to a status
 * summary from the query params without the full order — buyers can look
 * their order up from their email confirmation later.
 */
export default function CheckoutReturnPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = use(params);
  const search = useSearchParams();

  const orderNumber =
    search.get('vnp_TxnRef') ??
    search.get('orderId') ??
    null;
  const responseCode =
    search.get('vnp_ResponseCode') ??
    search.get('resultCode') ??
    null;
  const gatewayOk = responseCode === '00' || responseCode === '0';

  const [order, setOrder] = useState<OrderView | null>(null);
  const [checking, setChecking] = useState(true);

  // Poll the order 3 times, 1s apart, so the IPN has a chance to land before
  // we render the final state.
  useEffect(() => {
    if (!orderNumber) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    let tries = 0;
    async function poll() {
      try {
        const result = await getOrderByNumber(orderNumber!);
        if (cancelled) return;
        if (result.status === 'PAID' || result.status === 'PROCESSING' || tries >= 2) {
          setOrder(result);
          setChecking(false);
        } else {
          tries++;
          setTimeout(poll, 1500);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status !== 401 && e.status !== 403) {
          setChecking(false);
        } else if (tries < 2) {
          tries++;
          setTimeout(poll, 1500);
        } else {
          setChecking(false);
        }
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  const hero = pickHero({ gatewayOk, order, checking });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card className="p-8 text-center">
        <span className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${hero.bg}`}>
          <hero.Icon className={`size-7 ${hero.iconClass ?? ''}`} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{hero.title}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{hero.description}</p>
        {orderNumber ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Order <span className="font-mono font-semibold text-foreground">{orderNumber}</span> · via {provider.toUpperCase()}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          {orderNumber ? (
            <Button asChild>
              <Link href={`/orders/${orderNumber}`}>View order</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/products">Continue shopping</Link>
          </Button>
        </div>

        {!gatewayOk && responseCode ? (
          <Alert variant="destructive" className="mt-6 text-left">
            <AlertDescription>
              Gateway response code: <code className="font-mono">{responseCode}</code>. If money was deducted, contact support with your order number.
            </AlertDescription>
          </Alert>
        ) : null}
      </Card>
    </div>
  );
}

function pickHero({
  gatewayOk,
  order,
  checking,
}: {
  gatewayOk: boolean;
  order: OrderView | null;
  checking: boolean;
}): {
  title: string;
  description: string;
  Icon: typeof CheckCircle2;
  bg: string;
  iconClass?: string;
} {
  if (checking) {
    return {
      title: 'Confirming payment…',
      description: 'One moment while we verify your transaction.',
      Icon: Loader2,
      bg: 'bg-muted',
      iconClass: 'animate-spin',
    };
  }
  if (!gatewayOk) {
    return {
      title: 'Payment not completed',
      description: 'The gateway reported an unsuccessful payment. You can retry from your cart.',
      Icon: AlertCircle,
      bg: 'bg-red-100 text-red-700',
    };
  }
  if (order && (order.status === 'PAID' || order.status === 'PROCESSING')) {
    return {
      title: 'Payment received',
      description: 'Thanks for your order! You\'ll receive email updates as we prepare and ship your items.',
      Icon: CheckCircle2,
      bg: 'bg-emerald-100 text-emerald-700',
    };
  }
  return {
    title: 'Waiting for confirmation',
    description: 'We haven\'t seen the gateway confirmation yet. This usually resolves in a few seconds — refresh in a moment.',
    Icon: Clock,
    bg: 'bg-amber-100 text-amber-700',
  };
}
