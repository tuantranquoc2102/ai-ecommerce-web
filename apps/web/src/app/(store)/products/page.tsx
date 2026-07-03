import { redirect } from 'next/navigation';
import { ProductsListing } from '@/components/storefront/products-listing';
import { getCategoryTree } from '@/lib/storefront-api';

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const metadata = {
  title: 'All products',
  description: 'Browse our catalog.',
};

/**
 * Legacy `?category=<cuid-or-slug>` URLs get redirected to the SEO-friendly
 * `/c/<slug>` category page (which now hosts the full filter UI). Everything
 * else (search, sort, price, tags, page) stays as query params here on the
 * cross-catalog `/products` view.
 */
export default async function ProductsListingPage({ searchParams }: Props) {
  const params = await searchParams;

  if (params.category) {
    const tree = (await getCategoryTree()) ?? [];
    const match = findCategory(tree, params.category);
    if (match) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (k === 'category' || !v) continue;
        qs.set(k, v);
      }
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      redirect(`/c/${match.slug}${suffix}`);
    }
  }

  return <ProductsListing searchParams={params} activeCategory={null} basePath="/products" />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findCategory(tree: any[], idOrSlug: string): { id: string; slug: string } | null {
  for (const n of tree) {
    if (n.id === idOrSlug || n.slug === idOrSlug) return { id: n.id, slug: n.slug };
    const nested = findCategory(n.children ?? [], idOrSlug);
    if (nested) return nested;
  }
  return null;
}
