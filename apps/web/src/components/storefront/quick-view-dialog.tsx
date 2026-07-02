'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@ecom/ui';
import type { PublicProduct } from '@/lib/storefront-api';

export function QuickViewDialog({
  product,
  open,
  onOpenChange,
}: {
  product: PublicProduct;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const outOfStock = product.type === 'PHYSICAL' && product.stockQuantity <= 0;

  function addToCart() {
    toast({
      title: `Added "${product.title}" to cart`,
      description: 'Checkout is wired up in M3.3.',
      variant: 'success',
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.title}</DialogTitle>
          <DialogDescription className="sr-only">Quick view of {product.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="aspect-square overflow-hidden rounded-md bg-muted">
            {product.mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.mainImage}
                alt={product.title}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="mb-2 flex flex-wrap gap-1">
              {product.productCategories.slice(0, 2).map(({ category }) => (
                <Badge key={category.id} variant="secondary" className="text-xs">
                  {category.name}
                </Badge>
              ))}
            </div>
            <h3 className="text-xl font-semibold tracking-tight">{product.title}</h3>
            <div className="mt-2 flex items-baseline gap-2">
              {product.salePrice ? (
                <>
                  <span className="text-2xl font-semibold text-primary">${product.salePrice}</span>
                  <span className="text-sm text-muted-foreground line-through">
                    ${product.basePrice}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-semibold">${product.basePrice}</span>
              )}
            </div>
            {product.description ? (
              <p className="mt-4 line-clamp-4 text-sm text-muted-foreground">
                {product.description}
              </p>
            ) : null}

            <DialogFooter className="mt-6 sm:mt-auto">
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-11"
              >
                <Link href={`/p/${product.slug}`}>View full details</Link>
              </Button>
              <Button
                type="button"
                onClick={addToCart}
                disabled={outOfStock}
                className="h-11"
              >
                <ShoppingBag className="size-4" />
                {outOfStock ? 'Out of stock' : 'Add to cart'}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
