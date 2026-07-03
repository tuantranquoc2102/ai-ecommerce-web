'use client';

import { ShoppingBag } from 'lucide-react';
import { Button, useToast } from '@ecom/ui';
import { useCart } from '@/lib/cart/cart-context';
import type { PublicProduct } from '@/lib/storefront-api';

/**
 * Add-to-cart controls extracted from the (server-rendered) product detail
 * page. Renders two variants:
 *   - Desktop inline buttons (Add to cart + Buy now)
 *   - Mobile sticky bottom bar (price + Add to cart)
 *
 * Which one is visible is controlled by Tailwind lg: breakpoints on the
 * consumer — this component doesn't care and renders both.
 */
export function AddToCartControls({
  product,
  outOfStock,
}: {
  product: PublicProduct;
  outOfStock: boolean;
}) {
  const cart = useCart();
  const { toast } = useToast();

  function addToCart() {
    cart.add({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      mainImage: product.mainImage,
      unitPrice: product.salePrice ?? product.basePrice,
      basePrice: product.basePrice,
    });
    toast({ title: `Added "${product.title}" to cart`, variant: 'success' });
  }

  return (
    <>
      <div className="mt-8 hidden gap-2 lg:flex">
        <Button
          size="lg"
          disabled={outOfStock}
          onClick={addToCart}
          className="h-12 flex-1 text-base font-semibold"
        >
          <ShoppingBag className="size-4" />
          {outOfStock ? 'Out of stock' : 'Add to cart'}
        </Button>
        <Button variant="outline" size="lg" disabled={outOfStock} onClick={addToCart} className="h-12">
          Buy now
        </Button>
      </div>

      <p className="mt-3 hidden text-xs text-muted-foreground lg:block">
        Checkout wiring lands in M3.3. Items persist in browser storage in the meantime.
      </p>

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
            onClick={addToCart}
            className="ml-auto h-12 flex-1 text-base font-semibold"
          >
            <ShoppingBag className="size-4" />
            {outOfStock ? 'Out of stock' : 'Add to cart'}
          </Button>
        </div>
      </div>
    </>
  );
}
