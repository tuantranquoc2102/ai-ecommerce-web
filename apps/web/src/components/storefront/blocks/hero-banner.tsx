import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button, cn } from '@ecom/ui';
import { getActiveBanners } from '@/lib/storefront-api';

interface Props {
  /** Direct image URL (uploaded via ImageUpload in the block editor). */
  image?: unknown;
  /** Alternative to `image` — pulls one active banner from this position slot. */
  bannerPosition?: unknown;

  headline_show?: unknown;
  headline?: unknown;
  headline_color?: unknown;
  headline_fontSize?: unknown;

  subHeadline_show?: unknown;
  subHeadline?: unknown;
  subHeadline_color?: unknown;
  subHeadline_fontSize?: unknown;

  cta_show?: unknown;
  cta_label?: unknown;
  cta_href?: unknown;
  cta_variant?: unknown;

  secondaryCta_show?: unknown;
  secondaryCta_label?: unknown;
  secondaryCta_href?: unknown;
  secondaryCta_variant?: unknown;

  align?: unknown; // 'left' | 'center'
  aspect?: unknown; // 'wide' | 'square' | 'tall'
}

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost';
const VARIANTS: readonly ButtonVariant[] = ['default', 'secondary', 'outline', 'ghost'];

/**
 * Hero section — the "first-screen impression" block. Reads the M2.4 rich
 * schema (headline_show/_color/_fontSize + subHeadline + cta + secondaryCta).
 */
export async function HeroBannerBlock(props: Props) {
  const explicitImage = strOrNull(props.image);
  const position = strOrNull(props.bannerPosition);
  const banner = !explicitImage && position
    ? ((await getActiveBanners(position)) ?? [])[0] ?? null
    : null;

  const imageUrl = explicitImage ?? banner?.imageUrl ?? null;
  const linkFromBanner = banner?.targetUrl ?? null;
  const bannerAlt = banner?.altText ?? null;

  const headlineShow = boolProp(props.headline_show, true);
  const subShow = boolProp(props.subHeadline_show, true);
  const ctaShow = boolProp(props.cta_show, true);
  const secShow = boolProp(props.secondaryCta_show, true);

  const headline = headlineShow ? strOrNull(props.headline) : null;
  const sub = subShow ? strOrNull(props.subHeadline) : null;
  const ctaLabel = ctaShow ? strOrNull(props.cta_label) : null;
  const ctaHref = ctaShow ? strOrNull(props.cta_href) : null;
  const secLabel = secShow ? strOrNull(props.secondaryCta_label) : null;
  const secHref = secShow ? strOrNull(props.secondaryCta_href) : null;

  const headlineColor = strOrNull(props.headline_color);
  const subColor = strOrNull(props.subHeadline_color);
  const headlineFontSize = strOrNull(props.headline_fontSize);
  const subFontSize = strOrNull(props.subHeadline_fontSize);

  const ctaVariant = pickVariant(props.cta_variant, 'default');
  const secVariant = pickVariant(props.secondaryCta_variant, 'outline');

  const aspect =
    props.aspect === 'square'
      ? 'aspect-square sm:aspect-[4/3] md:aspect-[16/9]'
      : props.aspect === 'tall'
        ? 'aspect-[4/5] sm:aspect-[3/4]'
        : 'aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]';

  const hasOverlay = !!(headline || sub || ctaLabel || secLabel);
  const align = props.align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
      <div className={cn('relative w-full overflow-hidden rounded-xl bg-muted', aspect)}>
        {imageUrl ? (
          linkFromBanner && !hasOverlay ? (
            <Link href={linkFromBanner} className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={bannerAlt ?? headline ?? ''}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </Link>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={bannerAlt ?? headline ?? ''}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          )
        ) : null}

        {hasOverlay ? (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
            <div className={cn('absolute inset-0 flex px-6 py-8 sm:px-12 md:py-16', align, 'justify-center')}>
              <div className="max-w-xl text-white">
                {headline ? (
                  <h1
                    className={cn(
                      'font-bold leading-tight tracking-tight',
                      headlineFontSize ?? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
                    )}
                    style={headlineColor ? { color: headlineColor } : undefined}
                  >
                    {headline}
                  </h1>
                ) : null}
                {sub ? (
                  <p
                    className={cn('mt-3 text-white/90', subFontSize ?? 'text-base sm:text-lg')}
                    style={subColor ? { color: subColor } : undefined}
                  >
                    {sub}
                  </p>
                ) : null}
                {(ctaLabel && ctaHref) || (secLabel && secHref) ? (
                  <div className="pointer-events-auto mt-6 flex flex-wrap gap-3 sm:mt-8">
                    {ctaLabel && ctaHref ? (
                      <Button asChild size="lg" variant={ctaVariant} className="h-12 px-8 text-base font-semibold shadow-lg">
                        <Link href={ctaHref}>
                          {ctaLabel} <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    ) : null}
                    {secLabel && secHref ? (
                      <Button
                        asChild
                        variant={secVariant}
                        size="lg"
                        className={cn(
                          'h-12 px-8 text-base font-semibold',
                          secVariant === 'outline' &&
                            'border-white/60 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white',
                        )}
                      >
                        <Link href={secHref}>{secLabel}</Link>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {!imageUrl && !hasOverlay ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Configure a banner image or headline text.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function boolProp(v: unknown, def: boolean): boolean {
  if (v === true) return true;
  if (v === false) return false;
  return def;
}

function pickVariant(v: unknown, def: ButtonVariant): ButtonVariant {
  return VARIANTS.includes(v as ButtonVariant) ? (v as ButtonVariant) : def;
}
