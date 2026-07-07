import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/storefront/site-header';
import { SiteFooter } from '@/components/storefront/site-footer';
import { CartProvider } from '@/lib/cart/cart-context';

// Cache storefront route shells for 5 minutes; content updates are still
// pushed quickly via on-demand tag revalidation from admin mutations.
export const revalidate = 300;

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter />
    </CartProvider>
  );
}
