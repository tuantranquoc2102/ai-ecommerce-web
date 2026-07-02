import Link from 'next/link';
import { ProductCard } from '@/components/storefront/blocks/product-grid';
import { getCategoryTree, listPublicProducts } from '@/lib/storefront-api';
import type { CategoryTreeNode } from '@ecom/shared';

interface Props {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export const metadata = {
  title: 'All products',
  description: 'Browse our catalog.',
};

export default async function ProductsListingPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const [products, tree] = await Promise.all([
    listPublicProducts({
      categoryId: params.category,
      search: params.q,
      page,
      pageSize: PAGE_SIZE,
      sortBy: 'createdAt',
      sortDir: 'desc',
    }),
    getCategoryTree(),
  ]);

  const items = products?.items ?? [];
  const total = products?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const roots = tree ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">All products</h1>
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} product{total === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <CategoryFilter tree={roots} active={params.category} />
        <div>
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
                <Pagination current={page} total={pageCount} basePath="/products" params={params} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryFilter({
  tree,
  active,
}: {
  tree: CategoryTreeNode[];
  active?: string;
}) {
  return (
    <aside className="space-y-2 text-sm">
      <h2 className="mb-2 font-semibold">Categories</h2>
      <Link
        href="/products"
        className={
          !active
            ? 'block rounded-md bg-accent px-2 py-1 font-medium'
            : 'block rounded-md px-2 py-1 text-muted-foreground hover:text-foreground'
        }
      >
        All
      </Link>
      {tree.length === 0 ? (
        <p className="text-xs text-muted-foreground">No categories yet.</p>
      ) : (
        <ul className="space-y-0.5">
          {tree.map((c) => (
            <CategoryFilterItem key={c.id} node={c} active={active} depth={0} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function CategoryFilterItem({
  node,
  active,
  depth,
}: {
  node: CategoryTreeNode;
  active?: string;
  depth: number;
}) {
  return (
    <li>
      <Link
        href={`/products?category=${node.id}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        className={
          active === node.id
            ? 'block rounded-md bg-accent py-1 font-medium'
            : 'block rounded-md py-1 text-muted-foreground hover:text-foreground'
        }
      >
        {node.name}{' '}
        {node.productCount > 0 ? (
          <span className="ml-1 text-xs text-muted-foreground">({node.productCount})</span>
        ) : null}
      </Link>
      {node.children.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <CategoryFilterItem key={child.id} node={child} active={active} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
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
    if (params.category) qs.set('category', params.category);
    if (params.q) qs.set('q', params.q);
    if (p > 1) qs.set('page', String(p));
    return qs.toString() ? `${basePath}?${qs.toString()}` : basePath;
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
