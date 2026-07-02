import { cn } from '@ecom/ui';
import {
  getProductsByIds,
  listPublicProducts,
  type PublicProduct,
} from '@/lib/storefront-api';
import { ProductCard } from '../product-card';

// Re-exported so existing imports from this file keep working.
export { ProductCard };

interface Props {
  source?: unknown; // 'category' | 'tag' | 'manual'
  categoryId?: unknown;
  tagId?: unknown;
  productIds?: unknown;
  limit?: unknown;
  columns?: unknown;
  sortBy?: unknown;
  sortDir?: unknown;
  /** Editor-supplied badge label applied to every card ("Best seller"). */
  cardBadge?: unknown;
  /** Section heading shown above the grid. */
  title?: unknown;
  subtitle?: unknown;
}

/**
 * ProductGrid block: renders a grid of product cards. Data source is one of:
 *   - source="category" + categoryId — list products in that category
 *   - source="tag" + tagId — list products carrying that tag
 *   - source="manual" + productIds[] — fetch each ID individually
 *
 * Placeholder IDs from /admin/pages/templates ("REPLACE_WITH_…") return no
 * results, so pages with unfinished templates render cleanly (empty grid)
 * instead of blowing up.
 */
export async function ProductGridBlock(props: Props) {
  const source = typeof props.source === 'string' ? props.source : 'category';
  const limit = normalizeLimit(props.limit, 8);
  const columns = normalizeColumns(props.columns, 4);
  const sortBy = normalizeSortBy(props.sortBy);
  const sortDir = props.sortDir === 'asc' ? 'asc' : 'desc';
  const cardBadge = typeof props.cardBadge === 'string' && props.cardBadge.trim() ? props.cardBadge : undefined;
  const title = typeof props.title === 'string' ? props.title : null;
  const subtitle = typeof props.subtitle === 'string' ? props.subtitle : null;

  const products = await fetchProducts(source, {
    categoryId: typeof props.categoryId === 'string' ? props.categoryId : undefined,
    tagId: typeof props.tagId === 'string' ? props.tagId : undefined,
    productIds: Array.isArray(props.productIds)
      ? (props.productIds as unknown[]).filter((x): x is string => typeof x === 'string')
      : undefined,
    limit,
    sortBy,
    sortDir,
  });

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {title || subtitle ? (
        <div className="mb-6 text-center">
          {title ? (
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          'grid gap-4',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-2 md:grid-cols-3',
          columns === 4 && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          columns === 5 && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        )}
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} badgeLabel={cardBadge} />
        ))}
      </div>
    </section>
  );
}

async function fetchProducts(
  source: string,
  params: {
    categoryId?: string;
    tagId?: string;
    productIds?: string[];
    limit: number;
    sortBy: 'createdAt' | 'title' | 'basePrice';
    sortDir: 'asc' | 'desc';
  },
): Promise<PublicProduct[]> {
  if (source === 'manual') {
    if (!params.productIds?.length) return [];
    const valid = params.productIds.filter((id) => id && !id.startsWith('REPLACE'));
    if (valid.length === 0) return [];
    const results = await getProductsByIds(valid);
    return results.filter((p): p is PublicProduct => p !== null).slice(0, params.limit);
  }
  const categoryId = source === 'category' && !params.categoryId?.startsWith('REPLACE') ? params.categoryId : undefined;
  const tagId = source === 'tag' && !params.tagId?.startsWith('REPLACE') ? params.tagId : undefined;

  if (source === 'category' && !categoryId) return [];
  if (source === 'tag' && !tagId) return [];

  const list = await listPublicProducts({
    categoryId,
    tagId,
    pageSize: params.limit,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  });
  return list?.items ?? [];
}

function normalizeLimit(v: unknown, def: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 && n <= 50 ? Math.floor(n) : def;
}

function normalizeColumns(v: unknown, def: number): 2 | 3 | 4 | 5 {
  const n = typeof v === 'number' ? v : Number(v);
  if (n === 2 || n === 3 || n === 5) return n;
  if (n === 4) return 4;
  return def as 2 | 3 | 4 | 5;
}

function normalizeSortBy(v: unknown): 'createdAt' | 'title' | 'basePrice' {
  return v === 'title' || v === 'basePrice' ? v : 'createdAt';
}
