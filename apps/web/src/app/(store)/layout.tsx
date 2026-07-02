import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/storefront/site-header';
import { SiteFooter } from '@/components/storefront/site-footer';

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter />
    </>
  );
}
