import { HeroBannerBlock } from './blocks/hero-banner';
import { BannerSliderBlock } from './blocks/banner-slider';
import { ProductGridBlock } from './blocks/product-grid';
import { FlashSaleCountdownBlock } from './blocks/flash-sale-countdown';
import { CategoryListBlock } from './blocks/category-list';
import { RichTextBlock } from './blocks/rich-text';
import { ImageBlock } from './blocks/image-block';
import { CtaButtonBlock } from './blocks/cta-button';
import { TextColumnsBlock } from './blocks/text-columns';
import { DividerBlock } from './blocks/divider';
import { FaqBlock } from './blocks/faq';
import { TestimonialsBlock } from './blocks/testimonials';
import { TrustBadgesBlock } from './blocks/trust-badges';
import { NewsletterBlock } from './blocks/newsletter';

/**
 * Layout JSON contract:
 *   { blocks: Block[] }
 *
 * where each Block is { id, type, props }. Unknown types render nothing and
 * (in dev) log a warning. See /admin/pages/templates for the reference of
 * every valid `type` and expected `props` shape.
 */
export interface Block {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

export interface PageLayout {
  blocks?: Block[];
}

export async function BlockRenderer({ layout }: { layout: unknown }) {
  const blocks = extractBlocks(layout);
  if (blocks.length === 0) {
    return null;
  }
  return (
    <>
      {blocks.map((block) => (
        <BlockDispatch key={block.id} block={block} />
      ))}
    </>
  );
}

function extractBlocks(layout: unknown): Block[] {
  if (!layout || typeof layout !== 'object') return [];
  const raw = (layout as PageLayout).blocks;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (b): b is Block =>
      !!b && typeof b === 'object' && typeof (b as Block).type === 'string',
  );
}

async function BlockDispatch({ block }: { block: Block }) {
  switch (block.type) {
    case 'HeroBanner':
      return <HeroBannerBlock {...block.props} />;
    case 'BannerSlider':
      return <BannerSliderBlock {...block.props} />;
    case 'ProductGrid':
      return <ProductGridBlock {...block.props} />;
    case 'FlashSaleCountdown':
      return <FlashSaleCountdownBlock {...block.props} />;
    case 'CategoryList':
      return <CategoryListBlock {...block.props} />;
    case 'RichText':
      return <RichTextBlock {...block.props} />;
    case 'ImageBlock':
      return <ImageBlock {...block.props} />;
    case 'CTAButton':
      return <CtaButtonBlock {...block.props} />;
    case 'TextColumns':
      return <TextColumnsBlock {...block.props} />;
    case 'Divider':
      return <DividerBlock {...block.props} />;
    case 'FAQ':
      return <FaqBlock {...block.props} />;
    case 'Testimonials':
      return <TestimonialsBlock {...block.props} />;
    case 'TrustBadges':
      return <TrustBadgesBlock {...block.props} />;
    case 'Newsletter':
      return <NewsletterBlock {...block.props} />;
    default:
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[BlockRenderer] Unknown block type "${block.type}" — skipped.`);
      }
      return null;
  }
}
