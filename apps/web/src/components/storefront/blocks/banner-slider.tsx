import { getActiveBanners } from '@/lib/storefront-api';
import { BannerSliderClient } from './banner-slider.client';

interface Props {
  bannerPosition?: unknown;
  autoPlayMs?: unknown;
  showDots?: unknown;
  showArrows?: unknown;
}

/**
 * BannerSlider block: fetches all active banners at a position (server-side)
 * and hands off to a client component for auto-rotation + user controls.
 */
export async function BannerSliderBlock(props: Props) {
  const position = typeof props.bannerPosition === 'string' ? props.bannerPosition : null;
  if (!position) return null;

  const banners = (await getActiveBanners(position)) ?? [];
  if (banners.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <BannerSliderClient
        banners={banners}
        autoPlayMs={typeof props.autoPlayMs === 'number' ? props.autoPlayMs : 5000}
        showDots={props.showDots !== false}
        showArrows={props.showArrows !== false}
      />
    </section>
  );
}
