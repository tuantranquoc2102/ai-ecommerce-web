'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@ecom/ui';
import { useCart } from '@/lib/cart/cart-context';

/**
 * Header cart button with a live-updating item-count badge. Renders "0" on
 * first paint (before localStorage hydration) so the SSR HTML and first
 * client render match — the badge then jumps to the real count within one
 * paint. suppressHydrationWarning tolerates the immediate flip.
 */
export function CartButton() {
  const { itemCount, hydrated } = useCart();
  const showBadge = hydrated && itemCount > 0;

  return (
    <Button variant="ghost" size="icon" aria-label="Cart" asChild className="relative">
      <Link href="/cart">
        <ShoppingBag className="size-4" />
        <span
          className={
            'absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow ' +
            (showBadge ? '' : 'hidden')
          }
          suppressHydrationWarning
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      </Link>
    </Button>
  );
}
