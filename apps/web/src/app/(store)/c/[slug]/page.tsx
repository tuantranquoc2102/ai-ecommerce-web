import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import { ProductsListing } from '@/components/storefront/products-listing';
import { getCategoryBySlug, type PublicCategoryDetail } from '@/lib/storefront-api';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: 'Category not found' };
  return {
    title: category.name,
    description:
      category.description ??
      `Shop ${category._count.productCategories} products in ${category.name}.`,
    openGraph: category.imageUrl ? { images: [category.imageUrl] } : undefined,
    alternates: { canonical: `/c/${category.slug}` },
  };
}

/**
 * SEO-friendly category page. The URL is `/c/<slug>` — Google indexes one
 * clean canonical per category, and the sidebar links from `/products` route
 * shoppers here as well. Combines a category hero (image + description +
 * subcategory tiles) with the full filter UI (search, sort, price, tags).
 */
export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <ProductsListing
      searchParams={sp}
      activeCategory={{
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
      }}
      basePath={`/c/${category.slug}`}
      breadcrumbs={<Breadcrumbs category={category} />}
      hero={<CategoryHero category={category} />}
    />
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

function CategoryHero({ category }: { category: PublicCategoryDetail }) {
  return (
    <>
      <header className="mb-6">
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
              {category._count.productCategories.toLocaleString()} product{category._count.productCategories === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </header>

      {category.children.length > 0 ? (
        <section className="mb-8">
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
    </>
  );
}
