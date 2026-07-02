'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, cn } from '@ecom/ui';
import type { PublicBanner } from '@/lib/storefront-api';

interface Props {
  banners: PublicBanner[];
  autoPlayMs: number;
  showDots: boolean;
  showArrows: boolean;
}

export function BannerSliderClient({ banners, autoPlayMs, showDots, showArrows }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || banners.length < 2 || autoPlayMs <= 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), autoPlayMs);
    return () => clearInterval(t);
  }, [paused, autoPlayMs, banners.length]);

  const current = banners[index];
  if (!current) return null;

  return (
    <div
      className="relative aspect-[21/9] w-full overflow-hidden rounded-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((b, i) => (
        <Link
          key={b.id}
          href={b.targetUrl ?? '#'}
          className={cn(
            'absolute inset-0 transition-opacity duration-500',
            i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.imageUrl}
            alt={b.altText ?? ''}
            className="h-full w-full object-cover"
          />
        </Link>
      ))}

      {showArrows && banners.length > 1 ? (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            aria-label="Next slide"
          >
            <ChevronRight className="size-4" />
          </Button>
        </>
      ) : null}

      {showDots && banners.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                'size-2 rounded-full transition-colors',
                i === index ? 'bg-white' : 'bg-white/40 hover:bg-white/70',
              )}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
