import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight, PackageOpen } from 'lucide-react';
import { EmptyState } from '@ecom/ui';
import { ProductCard } from '@/components/storefront/product-card';
import {
  getCategoryBySlug,
  listPublicProducts,
  type PublicCategoryDetail,
} from '@/lib/storefront-api';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 20;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.name,
    description:
      category.description ??
      `Shop ${category._count.productCategories} products in ${category.name}.`,
    openGraph: category.imageUrl ? { images: [category.imageUrl] } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw ?? '1') || 1);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = await listPublicProducts({
    categoryId: category.id,
    page,
    pageSize: PAGE_SIZE,
    sortBy: 'createdAt',
    sortDir: 'desc',
  });
  const items = products?.items ?? [];
  const total = products?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs category={category} />

      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {category.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.imageUrl}
              alt=""
              className="size-24 rounded-lg object-cover"
              loading="eager"
              decoding="async"
            />
          ) : null}
          <div className="flex-1">
            <h1 className="text-3xl font-semibold tracking-tight">{category.name}</h1>
            {category.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {total.toLocaleString()} product{total === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </header>

      {category.children.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Subcategories
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {category.children.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="group rounded-lg border bg-card p-3 text-center transition-shadow hover:shadow-md"
              >
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imageUrl}
                    alt=""
                    className="mx-auto mb-2 size-14 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="mx-auto mb-2 size-14 rounded-full bg-muted" />
                )}
                <div className="text-sm font-medium group-hover:text-primary">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c._count.productCategories} product{c._count.productCategories === 1 ? '' : 's'}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        {items.length === 0 ? (
          <EmptyState
            icon={<PackageOpen />}
            title="No products in this category yet"
            description="Check back later — new products are added regularly."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {pageCount > 1 ? (
              <Pagination current={page} total={pageCount} slug={slug} />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function Breadcrumbs({ category }: { category: PublicCategoryDetail }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
      <Link href="/" className="hover:text-foreground">
        Home
      </Link>
      <ChevronRight className="size-3" />
      <Link href="/products" className="hover:text-foreground">
        Shop
      </Link>
      {category.parent ? (
        <>
          <ChevronRight className="size-3" />
          <Link href={`/c/${category.parent.slug}`} className="hover:text-foreground">
            {category.parent.name}
          </Link>
        </>
      ) : null}
      <ChevronRight className="size-3" />
      <span className="text-foreground">{category.name}</span>
    </nav>
  );
}

function Pagination({
  current,
  total,
  slug,
}: {
  current: number;
  total: number;
  slug: string;
}) {
  const build = (p: number) => (p > 1 ? `/c/${slug}?page=${p}` : `/c/${slug}`);
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
