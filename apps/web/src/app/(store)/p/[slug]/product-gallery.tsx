'use client';

import { useState } from 'react';
import { cn } from '@ecom/ui';

/**
 * Product-detail gallery: main image + clickable thumbnails. Client component
 * so the "which thumbnail is active" state can live locally.
 */
export function ProductGallery({
  images,
  alt,
}: {
  images: (string | null)[];
  alt: string;
}) {
  // Dedupe defensively — the parent should already dedupe, but React keys
  // must be unique so we enforce here as well.
  const usable = Array.from(
    new Set(images.filter((u): u is string => typeof u === 'string' && u.length > 0)),
  );
  const [active, setActive] = useState(0);

  if (usable.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
        No image
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={usable[active]}
          alt={alt}
          className="h-full w-full object-cover"
        />
      </div>
      {usable.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {usable.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'aspect-square overflow-hidden rounded-md border-2 transition-colors',
                i === active ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30',
              )}
              aria-label={`View image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
