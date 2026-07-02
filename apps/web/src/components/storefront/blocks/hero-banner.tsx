import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, cn } from '@ecom/ui';
import { getActiveBanners } from '@/lib/storefront-api';

interface Props {
  /** Banner slot key — pulls first ACTIVE banner from this position. */
  bannerPosition?: unknown;
  /** Optional headline overlay. When set, image gets a gradient darken to keep text legible. */
  headline?: unknown;
  subHeadline?: unknown;
  /** Optional primary CTA. Only shown when both label + href are set. */
  ctaLabel?: unknown;
  ctaHref?: unknown;
  /** Optional secondary CTA for "browse everything" style link. */
  secondaryCtaLabel?: unknown;
  secondaryCtaHref?: unknown;
  /** Content alignment when overlay text is present. */
  align?: unknown; // 'left' | 'center'
  /** Aspect ratio. Default 'wide' (21/9). Use 'tall' for full-viewport hero on portrait. */
  aspect?: unknown; // 'wide' | 'square' | 'tall'
}

/**
 * Hero section — the "first-screen impression" block. Combines a full-bleed
 * image (from the banners table) with a text overlay + CTA. Above-the-fold so
 * image loads eager; below-fold blocks should use the browser default lazy.
 *
 * If no banner is configured for the position slot, the block STILL renders
 * (with a muted background) so editors can preview a page before uploading
 * the final image — better than a mysterious empty section.
 */
export async function HeroBannerBlock(props: Props) {
  const position = typeof props.bannerPosition === 'string' ? props.bannerPosition : null;
  const banners = position ? ((await getActiveBanners(position)) ?? []) : [];
  const banner = banners[0] ?? null;

  const headline = strOrNull(props.headline);
  const sub = strOrNull(props.subHeadline);
  const ctaLabel = strOrNull(props.ctaLabel);
  const ctaHref = strOrNull(props.ctaHref);
  const secondaryLabel = strOrNull(props.secondaryCtaLabel);
  const secondaryHref = strOrNull(props.secondaryCtaHref);

  const aspect =
    props.aspect === 'square'
      ? 'aspect-square sm:aspect-[4/3] md:aspect-[16/9]'
      : props.aspect === 'tall'
        ? 'aspect-[4/5] sm:aspect-[3/4]'
        : 'aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]';

  const hasOverlay = !!(headline || sub || ctaLabel);
  const align = props.align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
      <div className={cn('relative w-full overflow-hidden rounded-xl bg-muted', aspect)}>
        {banner ? (
          <Link
            href={banner.targetUrl ?? ctaHref ?? '#'}
            className={cn('absolute inset-0', hasOverlay && 'pointer-events-none')}
            aria-label={banner.altText ?? headline ?? 'Hero banner'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.imageUrl}
              alt={banner.altText ?? headline ?? ''}
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </Link>
        ) : null}

        {hasOverlay ? (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
            <div className={cn('absolute inset-0 flex px-6 py-8 sm:px-12 md:py-16', align, 'justify-center')}>
              <div className="max-w-xl text-white">
                {headline ? (
                  <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                    {headline}
                  </h1>
                ) : null}
                {sub ? (
                  <p className="mt-3 text-base text-white/90 sm:text-lg">{sub}</p>
                ) : null}
                {(ctaLabel && ctaHref) || (secondaryLabel && secondaryHref) ? (
                  <div className="pointer-events-auto mt-6 flex flex-wrap gap-3 sm:mt-8">
                    {ctaLabel && ctaHref ? (
                      <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-lg">
                        <Link href={ctaHref}>
                          {ctaLabel} <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    ) : null}
                    {secondaryLabel && secondaryHref ? (
                      <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="h-12 border-white/60 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur hover:bg-white/20 hover:text-white"
                      >
                        <Link href={secondaryHref}>{secondaryLabel}</Link>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {!banner && !hasOverlay ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Configure a banner at position "{position ?? '(unset)'}" or add headline text.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}
