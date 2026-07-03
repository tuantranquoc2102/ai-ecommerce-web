import Link from 'next/link';
import type { ReactNode } from 'react';
import { ProductCard } from '@/components/storefront/blocks/product-grid';
import { CategoryFilter } from '@/components/storefront/category-filter';
import {
  ActiveFiltersBar,
  ProductPriceTagFilters,
  ProductSearchAndSort,
} from '@/components/storefront/product-filters';
import { getCategoryTree, getPublicTags, listPublicProducts } from '@/lib/storefront-api';

interface ActiveCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
}

interface Props {
  searchParams: Record<string, string | undefined>;
  activeCategory: ActiveCategory | null;
  /**
   * URL prefix used for pagination. Should not include the query string —
   * pagination stitches its own query params in. Pass `/products` for the
   * all-products view, `/c/<slug>` for a category page.
   */
  basePath: string;
  /**
   * Optional content rendered above the filter grid — e.g. the category
   * hero (image + description + subcategory row) on `/c/<slug>`. Skipped on
   * the plain `/products` view.
   */
  hero?: ReactNode;
  /** Rendered above the hero for the category page's breadcrumbs, etc. */
  breadcrumbs?: ReactNode;
}

const PAGE_SIZE = 20;

const ALLOWED_SORT_BY = ['createdAt', 'title', 'basePrice'] as const;
type AllowedSortBy = (typeof ALLOWED_SORT_BY)[number];
const ALLOWED_SORT_DIR = ['asc', 'desc'] as const;
type AllowedSortDir = (typeof ALLOWED_SORT_DIR)[number];

function coerceSortBy(v: string | undefined): AllowedSortBy {
  return (ALLOWED_SORT_BY as readonly string[]).includes(v ?? '')
    ? (v as AllowedSortBy)
    : 'createdAt';
}
function coerceSortDir(v: string | undefined): AllowedSortDir {
  return (ALLOWED_SORT_DIR as readonly string[]).includes(v ?? '')
    ? (v as AllowedSortDir)
    : 'desc';
}
function coercePositiveNumber(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Shared server component that renders the /products listing UI. Used by
 * both `/products` (no category active) and `/products/c/<slug>`. Handles
 * fetching the category tree + tag list + product page, applies the
 * search/sort/price/tag filters read from `searchParams`, and lays out the
 * sidebar + search bar + grid + pagination.
 */
export async function ProductsListing({
  searchParams,
  activeCategory,
  basePath,
  hero,
  breadcrumbs,
}: Props) {
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const sortBy = coerceSortBy(searchParams.sortBy);
  const sortDir = coerceSortDir(searchParams.sortDir);
  const minPrice = coercePositiveNumber(searchParams.minPrice);
  const maxPrice = coercePositiveNumber(searchParams.maxPrice);
  const tagIds = searchParams.tagIds ?? searchParams.tagId;

  const [products, tree, tags] = await Promise.all([
    listPublicProducts({
      categoryId: activeCategory?.id,
      search: searchParams.q,
      minPrice,
      maxPrice,
      tagIds,
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortDir,
    }),
    getCategoryTree(),
    getPublicTags(),
  ]);

  const items = products?.items ?? [];
  const total = products?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const roots = tree ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {breadcrumbs}

      {hero ? (
        hero
      ) : (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">All products</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} product{total === 1 ? '' : 's'}
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <CategoryFilter tree={roots} active={activeCategory?.id} />
          <ProductPriceTagFilters tags={tags ?? []} />
        </aside>
        <div className="min-w-0">
          <ProductSearchAndSort />
          <ActiveFiltersBar categoryName={activeCategory?.name} />

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">
                No products match your filter yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {pageCount > 1 ? (
                <Pagination
                  current={page}
                  total={pageCount}
                  basePath={basePath}
                  params={searchParams}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Pagination({
  current,
  total,
  basePath,
  params,
}: {
  current: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const build = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === 'page') continue;
      if (v) qs.set(k, v);
    }
    if (p > 1) qs.set('page', String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav className="mt-8 flex items-center justify-between text-sm">
      <Link
        href={build(Math.max(1, current - 1))}
        className={
          current === 1
            ? 'pointer-events-none text-muted-foreground'
            : 'hover:text-primary'
        }
        aria-disabled={current === 1}
      >
        ← Previous
      </Link>
      <span className="text-muted-foreground">
        Page {current} of {total}
      </span>
      <Link
        href={build(Math.min(total, current + 1))}
        className={
          current === total
            ? 'pointer-events-none text-muted-foreground'
            : 'hover:text-primary'
        }
        aria-disabled={current === total}
      >
        Next →
      </Link>
    </nav>
  );
}
