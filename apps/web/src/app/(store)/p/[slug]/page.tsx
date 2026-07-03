import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Badge } from '@ecom/ui';
import { getProductBySlug } from '@/lib/storefront-api';
import { ProductGallery } from './product-gallery';
import { AddToCartControls } from './add-to-cart-controls';

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
                href={`/c/${category.slug}`}
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

          <AddToCartControls product={product} outOfStock={outOfStock} />
        </div>
      </div>
    </div>
  );
}
