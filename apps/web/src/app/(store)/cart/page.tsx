'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Separator, useToast } from '@ecom/ui';
import { useCart } from '@/lib/cart/cart-context';

/**
 * /cart page — client-only. Reads from localStorage-backed cart context.
 * Backend order creation lives in M3.3; the "Checkout" button toasts a
 * placeholder for now so the flow doesn't dead-end.
 */
export default function CartPage() {
  const { items, itemCount, subtotal, hydrated, updateQty, remove, clear } = useCart();
  const { toast } = useToast();
  const router = useRouter();

  if (!hydrated) {
    // First paint — cart context hasn't loaded localStorage yet.
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Your cart</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<ShoppingBag />}
          title="Your cart is empty"
          description="Browse the catalog and add products to see them here."
          action={
            <Button asChild size="lg">
              <Link href="/products">Start shopping</Link>
            </Button>
          }
        />
      </div>
    );
  }

  function checkout() {
    router.push('/checkout');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        <p className="text-sm text-muted-foreground">
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-3">
          {items.map((item) => {
            const lineTotal = Number(item.unitPrice) * item.quantity;
            const isSale = item.unitPrice !== item.basePrice;
            return (
              <li key={item.productId}>
                <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <Link
                    href={`/p/${item.slug}`}
                    className="size-24 shrink-0 overflow-hidden rounded-md bg-muted"
                    aria-label={`View ${item.title}`}
                  >
                    {item.mainImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.mainImage}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/p/${item.slug}`}
                      className="line-clamp-2 text-sm font-medium hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-sm font-semibold">${item.unitPrice}</span>
                      {isSale ? (
                        <span className="text-xs text-muted-foreground line-through">
                          ${item.basePrice}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <QtyStepper
                      value={item.quantity}
                      onChange={(q) => updateQty(item.productId, q)}
                    />
                    <div className="min-w-[80px] text-right text-sm font-semibold">
                      ${lineTotal.toFixed(2)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(item.productId)}
                      aria-label={`Remove ${item.title}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <Card className="p-5">
            <h2 className="text-base font-semibold">Order summary</h2>
            <Separator className="my-4" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">${subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="text-muted-foreground">Calculated at checkout</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="text-muted-foreground">—</dd>
              </div>
            </dl>
            <Separator className="my-4" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-semibold">${subtotal.toFixed(2)}</span>
            </div>

            <Button size="lg" className="mt-6 h-12 w-full text-base font-semibold" onClick={checkout}>
              Checkout <ArrowRight className="size-4" />
            </Button>

            <Button asChild variant="outline" className="mt-3 w-full">
              <Link href="/products">Continue shopping</Link>
            </Button>

            <button
              type="button"
              onClick={() => {
                clear();
                toast({ title: 'Cart cleared' });
              }}
              className="mt-4 block w-full text-center text-xs text-muted-foreground hover:text-destructive"
            >
              Clear cart
            </button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function QtyStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-md border">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className="size-8 rounded-r-none"
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className="size-8 rounded-l-none"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
