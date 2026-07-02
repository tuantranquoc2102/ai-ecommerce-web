import { getActiveBanners } from '@/lib/storefront-api';
import { BannerSliderClient, type SlideConfig } from './banner-slider.client';

interface Props {
  /** Inline slides configured in the block editor. Takes precedence over `bannerPosition`. */
  slides?: unknown;
  /** Alternative: pull banners from a position slot. */
  bannerPosition?: unknown;
  autoPlayMs?: unknown;
  showDots?: unknown;
  showArrows?: unknown;
}

/**
 * BannerSlider block. Two data modes:
 *   1. Inline `slides[]` with per-slide headline/subHeadline/image/CTA (edited
 *      via the M2.4 array field in the block editor).
 *   2. `bannerPosition` — legacy: pull the position's active banners.
 * Inline wins when both are present.
 */
export async function BannerSliderBlock(props: Props) {
  const inline = normalizeSlides(props.slides);
  let slides: SlideConfig[] = inline;

  if (slides.length === 0) {
    const position = typeof props.bannerPosition === 'string' ? props.bannerPosition : null;
    if (position) {
      const fetched = (await getActiveBanners(position)) ?? [];
      slides = fetched.map((b) => ({
        id: b.id,
        image: b.imageUrl,
        headline: null,
        headline_color: null,
        headline_fontSize: null,
        subHeadline: null,
        subHeadline_color: null,
        subHeadline_fontSize: null,
        cta_label: null,
        cta_href: b.targetUrl,
        cta_variant: 'default',
      }));
    }
  }

  if (slides.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <BannerSliderClient
        slides={slides}
        autoPlayMs={typeof props.autoPlayMs === 'number' ? props.autoPlayMs : 5000}
        showDots={props.showDots !== false}
        showArrows={props.showArrows !== false}
      />
    </section>
  );
}

function normalizeSlides(v: unknown): SlideConfig[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s, i): SlideConfig | null => {
      if (!s || typeof s !== 'object') return null;
      const raw = s as Record<string, unknown>;
      const image = typeof raw.image === 'string' && raw.image.trim() ? raw.image : null;
      if (!image) return null;
      return {
        id: `slide-${i}`,
        image,
        headline: boolFlag(raw.headline_show, true) ? str(raw.headline) : null,
        headline_color: str(raw.headline_color),
        headline_fontSize: str(raw.headline_fontSize),
        subHeadline: boolFlag(raw.subHeadline_show, true) ? str(raw.subHeadline) : null,
        subHeadline_color: str(raw.subHeadline_color),
        subHeadline_fontSize: str(raw.subHeadline_fontSize),
        cta_label: boolFlag(raw.cta_show, true) ? str(raw.cta_label) : null,
        cta_href: boolFlag(raw.cta_show, true) ? str(raw.cta_href) : null,
        cta_variant: str(raw.cta_variant) ?? 'default',
      };
    })
    .filter((s): s is SlideConfig => s !== null);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function boolFlag(v: unknown, def: boolean): boolean {
  if (v === true) return true;
  if (v === false) return false;
  return def;
}
