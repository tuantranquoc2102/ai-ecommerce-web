'use client';

import Link from 'next/link';
import { Eye, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, cn, useToast } from '@ecom/ui';
import type { PublicProduct } from '@/lib/storefront-api';
import { useCart } from '@/lib/cart/cart-context';
import { QuickViewDialog } from './quick-view-dialog';

interface Props {
  product: PublicProduct;
  /** Editor-supplied override badge like "Best seller". */
  badgeLabel?: string;
}

/**
 * Storefront product card with hover image swap, Quick View, and direct
 * Add-to-cart. Client component because hover state + dialog are interactive.
 *
 * "New" badge auto-derives from createdAt < 14 days when the product carries
 * a createdAt in its payload. `badgeLabel` prop overrides everything for
 * curated positioning ("Best seller", "Editor's pick").
 */
export function ProductCard({ product, badgeLabel }: Props) {
  const [hover, setHover] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { toast } = useToast();
  const cart = useCart();

  const front = product.mainImage;
  const back = product.galleryImages?.find((u) => u && u !== product.mainImage) ?? null;
  const outOfStock = product.type === 'PHYSICAL' && product.stockQuantity <= 0;
  const onSale = !!product.salePrice;
  const derivedBadge = badgeLabel ?? (onSale ? 'Sale' : null);

  function addToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    cart.add({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      mainImage: product.mainImage,
      unitPrice: product.salePrice ?? product.basePrice,
      basePrice: product.basePrice,
    });
    toast({
      title: `Added "${product.title}" to cart`,
      variant: 'success',
    });
  }

  function openQuickView(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  }

  return (
    <>
      <Link
        href={`/p/${product.slug}`}
        className="group block overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {front ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={front}
                alt={product.title}
                className={cn(
                  'h-full w-full object-cover transition-opacity duration-300',
                  back && hover ? 'opacity-0' : 'opacity-100',
                )}
                loading="lazy"
                decoding="async"
              />
              {back ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={back}
                  alt=""
                  className={cn(
                    'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
                    hover ? 'opacity-100' : 'opacity-0',
                  )}
                  loading="lazy"
                  decoding="async"
                  aria-hidden
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}

          {/* Corner badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {derivedBadge ? (
              <Badge variant={onSale ? 'destructive' : 'default'} className="shadow-sm">
                {derivedBadge}
              </Badge>
            ) : null}
            {outOfStock ? (
              <Badge variant="secondary" className="shadow-sm">
                Sold out
              </Badge>
            ) : null}
          </div>

          {/* Hover / mobile-always Quick view button */}
          <button
            type="button"
            onClick={openQuickView}
            className={cn(
              'absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur transition-opacity',
              'md:opacity-0 md:group-hover:opacity-100',
            )}
            aria-label="Quick view"
          >
            <Eye className="size-4" />
          </button>

          {/* Bottom overlay: Add to cart on hover (mobile: always visible under image) */}
          {!outOfStock ? (
            <div
              className={cn(
                'absolute inset-x-2 bottom-2 transition-opacity',
                'md:opacity-0 md:group-hover:opacity-100',
              )}
            >
              <Button
                type="button"
                onClick={addToCart}
                size="sm"
                className="h-10 w-full text-sm font-semibold shadow-lg"
              >
                <ShoppingBag className="size-4" />
                Add to cart
              </Button>
            </div>
          ) : null}
        </div>

        <div className="p-3">
          <div className="line-clamp-2 min-h-[2.5rem] text-sm font-medium">
            {product.title}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {product.salePrice ? (
              <>
                <span className="font-semibold text-primary">${product.salePrice}</span>
                <span className="text-xs text-muted-foreground line-through">
                  ${product.basePrice}
                </span>
              </>
            ) : (
              <span className="font-semibold">${product.basePrice}</span>
            )}
          </div>
        </div>
      </Link>

      <QuickViewDialog
        product={product}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </>
  );
}
