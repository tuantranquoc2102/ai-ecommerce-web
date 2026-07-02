'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, cn } from '@ecom/ui';

export interface SlideConfig {
  id: string;
  image: string;
  headline: string | null;
  headline_color: string | null;
  headline_fontSize: string | null;
  subHeadline: string | null;
  subHeadline_color: string | null;
  subHeadline_fontSize: string | null;
  cta_label: string | null;
  cta_href: string | null;
  cta_variant: string;
}

interface Props {
  slides: SlideConfig[];
  autoPlayMs: number;
  showDots: boolean;
  showArrows: boolean;
}

type Variant = 'default' | 'secondary' | 'outline' | 'ghost';
const VARIANTS: readonly Variant[] = ['default', 'secondary', 'outline', 'ghost'];

export function BannerSliderClient({ slides, autoPlayMs, showDots, showArrows }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2 || autoPlayMs <= 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), autoPlayMs);
    return () => clearInterval(t);
  }, [paused, autoPlayMs, slides.length]);

  const current = slides[index];
  if (!current) return null;

  return (
    <div
      className="relative aspect-[21/9] w-full overflow-hidden rounded-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <Slide key={s.id} slide={s} active={i === index} />
      ))}

      {showArrows && slides.length > 1 ? (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            aria-label="Next slide"
          >
            <ChevronRight className="size-4" />
          </Button>
        </>
      ) : null}

      {showDots && slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {slides.map((_, i) => (
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

function Slide({ slide, active }: { slide: SlideConfig; active: boolean }) {
  const hasOverlay = !!(slide.headline || slide.subHeadline || slide.cta_label);
  const variant = pickVariant(slide.cta_variant);

  return (
    <div
      className={cn(
        'absolute inset-0 transition-opacity duration-500',
        active ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!active}
    >
      {slide.cta_href && !hasOverlay ? (
        <Link href={slide.cta_href} className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image} alt={slide.headline ?? ''} className="h-full w-full object-cover" />
        </Link>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.image}
          alt={slide.headline ?? ''}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {hasOverlay ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          <div className="absolute inset-0 flex items-center justify-center px-6 py-8 text-center sm:px-12 md:py-16">
            <div className="max-w-xl text-white">
              {slide.headline ? (
                <h2
                  className={cn(
                    'font-bold leading-tight tracking-tight',
                    slide.headline_fontSize ?? 'text-3xl sm:text-4xl md:text-5xl',
                  )}
                  style={slide.headline_color ? { color: slide.headline_color } : undefined}
                >
                  {slide.headline}
                </h2>
              ) : null}
              {slide.subHeadline ? (
                <p
                  className={cn('mt-2 text-white/90', slide.subHeadline_fontSize ?? 'text-base sm:text-lg')}
                  style={
                    slide.subHeadline_color ? { color: slide.subHeadline_color } : undefined
                  }
                >
                  {slide.subHeadline}
                </p>
              ) : null}
              {slide.cta_label && slide.cta_href ? (
                <Button
                  asChild
                  size="lg"
                  variant={variant}
                  className="mt-5 h-12 px-8 text-base font-semibold shadow-lg"
                >
                  <Link href={slide.cta_href}>{slide.cta_label}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function pickVariant(v: string): Variant {
  return VARIANTS.includes(v as Variant) ? (v as Variant) : 'default';
}
