import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Badge, Button } from '@ecom/ui';
import { getProductBySlug } from '@/lib/storefront-api';
import { ProductGallery } from './product-gallery';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.title,
    description: product.description ?? undefined,
    openGraph: product.mainImage ? { images: [product.mainImage] } : undefined,
  };
}

export default async function ProductDetail({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // mainImage may also appear in galleryImages (editors "Set as main" keeps
  // the URL in both). Preserve order (main first) but drop duplicates.
  const gallery = Array.from(
    new Set(
      [product.mainImage, ...(product.galleryImages ?? [])]
        .filter((u): u is string => typeof u === 'string' && u.length > 0),
    ),
  );
  const outOfStock = product.type === 'PHYSICAL' && product.stockQuantity <= 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-1">/</span>
        <Link href="/products" className="hover:text-foreground">Products</Link>
        <span className="mx-1">/</span>
        <span className="text-foreground">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={gallery.length > 0 ? gallery : [null]} alt={product.title} />

        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {product.productCategories.map(({ category }) => (
              <Link
                key={category.id}
                href={`/products?category=${category.id}`}
                className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
              >
                {category.name}
              </Link>
            ))}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>

          <div className="mt-3 flex items-baseline gap-3">
            {product.salePrice ? (
              <>
                <span className="text-3xl font-semibold text-primary">${product.salePrice}</span>
                <span className="text-lg text-muted-foreground line-through">${product.basePrice}</span>
                <Badge variant="destructive">Sale</Badge>
              </>
            ) : (
              <span className="text-3xl font-semibold">${product.basePrice}</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {product.type === 'DIGITAL' ? `Digital · ${product.digitalType}` : 'Physical'}
            </Badge>
            {outOfStock ? (
              <Badge variant="destructive">Out of stock</Badge>
            ) : product.type === 'PHYSICAL' ? (
              <span className="text-xs text-muted-foreground">
                {product.stockQuantity} in stock
              </span>
            ) : null}
          </div>

          {product.description ? (
            <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </div>
          ) : null}

          {product.productTags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {product.productTags.map(({ tag }) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-8 hidden gap-2 lg:flex">
            <Button size="lg" disabled={outOfStock} className="h-12 flex-1 text-base font-semibold">
              {outOfStock ? 'Out of stock' : 'Add to cart'}
            </Button>
            <Button variant="outline" size="lg" disabled={outOfStock} className="h-12">
              Buy now
            </Button>
          </div>

          <p className="mt-3 hidden text-xs text-muted-foreground lg:block">
            Cart + checkout wiring lands in M3.3.
          </p>
        </div>
      </div>

      {/*
        Mobile sticky bottom bar. Renders below-lg only. h-16 gives the
        button a 44px+ tap target even with the surrounding chrome. Space
        below the container is added inline so the bar never covers content.
      */}
      <div className="h-24 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 shadow-lg backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0">
            {product.salePrice ? (
              <>
                <div className="text-lg font-semibold text-primary">${product.salePrice}</div>
                <div className="text-xs text-muted-foreground line-through">${product.basePrice}</div>
              </>
            ) : (
              <div className="text-lg font-semibold">${product.basePrice}</div>
            )}
          </div>
          <Button
            size="lg"
            disabled={outOfStock}
            className="ml-auto h-12 flex-1 text-base font-semibold"
          >
            {outOfStock ? 'Out of stock' : 'Add to cart'}
          </Button>
        </div>
      </div>
    </div>
  );
}
