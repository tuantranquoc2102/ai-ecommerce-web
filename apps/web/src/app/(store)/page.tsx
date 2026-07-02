import Link from 'next/link';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { Button } from '@ecom/ui';
import { BlockRenderer } from '@/components/storefront/block-renderer';
import { getPageBySlug } from '@/lib/storefront-api';

export default async function StoreHome() {
  const home = await getPageBySlug('home');
  if (home && home.status === 'PUBLISHED') {
    return <BlockRenderer layout={home.layoutJson} />;
  }
  return <DefaultHome />;
}

/**
 * Fallback landing shown when there's no published page with slug=home yet.
 * Points editors at the admin panel to create one.
 */
function DefaultHome() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <LayoutTemplate className="size-6" />
      </div>
      <h1 className="text-4xl font-semibold tracking-tight">Welcome to your storefront</h1>
      <p className="mt-3 text-muted-foreground">
        There's no <code className="rounded bg-muted px-1.5 py-0.5 text-sm">home</code> page yet.
        Create one from the admin panel — it will replace this placeholder automatically.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild>
          <Link href="/admin/pages">
            Open admin <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/pages/templates">Browse templates</Link>
        </Button>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        Tip: Create a page with slug <code className="rounded bg-muted px-1">home</code>, status
        PUBLISHED, and add blocks from <code className="rounded bg-muted px-1">/admin/pages/templates</code>.
      </p>
    </div>
  );
}
