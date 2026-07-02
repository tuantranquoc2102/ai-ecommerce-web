'use client';

import { ArrowLeft, Check, Copy, LayoutTemplate } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@ecom/ui';

/**
 * Reference / sample page for the CMS layoutJson block system.
 *
 * When implementing the storefront widget parser (M2.3), consumers should
 * accept an array of blocks with { id, type, props } shape and render each
 * one by dispatching on `type`. Every template below is a valid block; the
 * "Full page example" section shows how they compose.
 *
 * Editors can copy any snippet and paste it into a page's Layout JSON field.
 */

interface BlockTemplate {
  type: string;
  title: string;
  description: string;
  when: string;
  badges: string[];
  json: object;
}

const TEMPLATES: BlockTemplate[] = [
  {
    type: 'HeroBanner',
    title: 'Hero Banner — with headline + CTA',
    description:
      'Full-bleed image with overlay headline, sub-headline, and a primary CTA button. Answers the 3 first-screen questions in one shot: what is this, what do I get, what to do next.',
    when: 'Homepage hero, landing page top, campaign page opener.',
    badges: ['banners', 'headline', 'CTA', 'above-the-fold'],
    json: {
      id: 'hero-1',
      type: 'HeroBanner',
      props: {
        bannerPosition: 'home_hero',
        headline: 'Summer collection is here',
        subHeadline: 'Free shipping over $50 + easy 30-day returns.',
        ctaLabel: 'Shop the drop',
        ctaHref: '/products',
        secondaryCtaLabel: 'Browse categories',
        secondaryCtaHref: '/products',
        align: 'center', // 'center' | 'left'
        aspect: 'wide',  // 'wide' | 'square' | 'tall'
      },
    },
  },
  {
    type: 'BannerSlider',
    title: 'Banner Slider',
    description:
      'Auto-rotating carousel of all active banners at a position slot, ordered by sortOrder. Click tracking on each slide.',
    when: 'Promotional strips, seasonal announcements, multi-campaign hero.',
    badges: ['banners', 'carousel', 'auto-play'],
    json: {
      id: 'slider-home',
      type: 'BannerSlider',
      props: {
        bannerPosition: 'home_promo',
        autoPlayMs: 5000,
        showDots: true,
        showArrows: true,
      },
    },
  },
  {
    type: 'ProductGrid',
    title: 'Product Grid — by Category',
    description:
      'Renders products from a specific category, sorted by newest. Pulls live from catalog — no manual selection needed.',
    when: 'Category landing pages, "New in Electronics" sections.',
    badges: ['catalog', 'dynamic'],
    json: {
      id: 'grid-electronics',
      type: 'ProductGrid',
      props: {
        source: 'category',
        categoryId: 'REPLACE_WITH_CATEGORY_ID',
        limit: 8,
        columns: 4,
        sortBy: 'createdAt',
        sortDir: 'desc',
      },
    },
  },
  {
    type: 'ProductGrid',
    title: 'Product Grid — by Tag',
    description: 'Renders products carrying a specific tag. Same layout as category grid, different filter.',
    when: '"Featured", "Best sellers", "Editor picks" sections keyed off tags.',
    badges: ['catalog', 'dynamic'],
    json: {
      id: 'grid-featured',
      type: 'ProductGrid',
      props: {
        source: 'tag',
        tagId: 'REPLACE_WITH_TAG_ID',
        limit: 12,
        columns: 4,
      },
    },
  },
  {
    type: 'ProductGrid',
    title: 'Product Grid — Manual selection',
    description:
      'Editor-curated set of product IDs. Preserves order. Good for hand-picked promotions where automated filters don\'t fit.',
    when: 'Landing pages with a chosen list, seasonal collections.',
    badges: ['catalog', 'curated'],
    json: {
      id: 'grid-featured-picks',
      type: 'ProductGrid',
      props: {
        source: 'manual',
        productIds: ['REPLACE_WITH_PRODUCT_ID_1', 'REPLACE_WITH_PRODUCT_ID_2'],
        columns: 3,
      },
    },
  },
  {
    type: 'FlashSaleCountdown',
    title: 'Flash Sale Countdown',
    description:
      'Countdown to a target datetime with a product grid attached. Auto-hides after the deadline unless configured otherwise.',
    when: 'Time-limited promotions, "24-hour deals", event sales.',
    badges: ['catalog', 'time-limited'],
    json: {
      id: 'flash-sale-friday',
      type: 'FlashSaleCountdown',
      props: {
        endAt: '2026-12-31T23:59:59.000Z',
        title: '⚡ Flash Sale',
        productIds: ['REPLACE_1', 'REPLACE_2', 'REPLACE_3'],
        hideAfterEnd: true,
      },
    },
  },
  {
    type: 'CategoryList',
    title: 'Category List',
    description:
      'Rendered category tiles or list — pulls names + images from the catalog. Useful for navigation-heavy pages.',
    when: 'Homepage "Shop by category", storefront navigation blocks.',
    badges: ['catalog'],
    json: {
      id: 'categories-showcase',
      type: 'CategoryList',
      props: {
        parentId: null, // null = root categories only
        limit: 6,
        layout: 'grid', // grid | list
        showImage: true,
      },
    },
  },
  {
    type: 'RichText',
    title: 'Rich Text',
    description:
      'HTML body sanitized on render. Use for long-form content: about us, FAQ, terms. Sanitized against XSS on the parser side.',
    when: 'Static-copy sections, article body, marketing prose.',
    badges: ['content'],
    json: {
      id: 'about-body',
      type: 'RichText',
      props: {
        html: '<h2>About us</h2><p>Your company story. Supports <strong>bold</strong>, <em>italic</em>, and <a href="/">links</a>.</p>',
        maxWidth: 'prose', // prose | full
      },
    },
  },
  {
    type: 'ImageBlock',
    title: 'Image Block',
    description:
      'Single image with optional caption and link. Sizes are enforced against the design system so images don\'t break layouts.',
    when: 'Inline illustrations, article images, hero-supporting art.',
    badges: ['content'],
    json: {
      id: 'about-hero-img',
      type: 'ImageBlock',
      props: {
        url: 'http://localhost:9000/ecom/pages/about-hero.jpg',
        alt: 'Our team at work',
        caption: 'HQ, spring 2026',
        href: null,
        maxWidth: 'container', // container | prose | full-bleed
      },
    },
  },
  {
    type: 'CTAButton',
    title: 'CTA Button',
    description:
      'Prominent call-to-action button. Wired to a link + optional analytics event name.',
    when: 'Landing pages, campaign closers, "Start shopping" buttons.',
    badges: ['content'],
    json: {
      id: 'cta-shop-now',
      type: 'CTAButton',
      props: {
        label: 'Shop new arrivals',
        href: '/products?sort=new',
        variant: 'default', // default | outline | secondary
        size: 'lg',
        eventName: 'cta_shop_now_clicked',
      },
    },
  },
  {
    type: 'TextColumns',
    title: 'Text Columns',
    description: '2- or 3-column text layout. Each column has heading + body. Good for features lists.',
    when: 'Feature highlights, "Why us" sections, comparison strips.',
    badges: ['content', 'layout'],
    json: {
      id: 'features-strip',
      type: 'TextColumns',
      props: {
        columns: 3,
        items: [
          { icon: 'Truck', heading: 'Fast delivery', body: 'Ships in 24h nationwide.' },
          { icon: 'ShieldCheck', heading: 'Secure checkout', body: 'PCI-compliant payments.' },
          { icon: 'RefreshCcw', heading: 'Easy returns', body: '30-day money-back.' },
        ],
      },
    },
  },
  {
    type: 'Divider',
    title: 'Divider',
    description: 'Horizontal spacer with optional label. Used to break long pages into visual sections.',
    when: 'Between major blocks, before a footer-like closing section.',
    badges: ['layout'],
    json: {
      id: 'divider-1',
      type: 'Divider',
      props: {
        label: 'Recommended for you',
        thickness: 'thin', // thin | thick
      },
    },
  },
  {
    type: 'TrustBadges',
    title: 'Trust Badges',
    description:
      'Row of reassurance items (free shipping, secure checkout, easy returns) that inoculate visitors against friction. Place immediately under the hero.',
    when: 'Below hero on every landing page. Reduces cart abandonment.',
    badges: ['trust', 'conversion', 'social-proof'],
    json: {
      id: 'trust-strip',
      type: 'TrustBadges',
      props: {
        variant: 'strip', // 'strip' | 'grid'
        items: [
          { icon: 'Truck', title: 'Free shipping', subtitle: 'Orders over $50' },
          { icon: 'ShieldCheck', title: 'Secure checkout', subtitle: 'PCI-DSS compliant' },
          { icon: 'RefreshCcw', title: 'Easy returns', subtitle: '30-day money back' },
          { icon: 'Headphones', title: '24/7 support', subtitle: 'We reply in 2h' },
        ],
      },
    },
  },
  {
    type: 'Testimonials',
    title: 'Testimonials / UGC',
    description:
      'Customer quotes with optional photos (user-generated content — the highest-converting social proof for e-commerce). Ideally 3-6 real reviews with real customer photos.',
    when: 'Between product showcase and final CTA. Answers "does this actually work for people like me?".',
    badges: ['social-proof', 'UGC', 'conversion'],
    json: {
      id: 'testimonials-1',
      type: 'Testimonials',
      props: {
        title: 'Loved by 2,000+ shoppers',
        subtitle: 'Real reviews from real customers.',
        items: [
          {
            name: 'Minh N.',
            location: 'Ho Chi Minh City',
            rating: 5,
            quote: 'Delivery was crazy fast and packaging was on point. Ordered again the next week.',
            photoUrl: 'http://localhost:9000/ecom/pages/ugc-1.jpg',
          },
          {
            name: 'Lan T.',
            location: 'Hanoi',
            rating: 5,
            quote: 'Quality exceeded my expectations for the price. The size guide is accurate too.',
          },
          {
            name: 'Duc P.',
            location: 'Da Nang',
            rating: 4,
            quote: 'Great value. Only tiny nit is I wish more colors were in stock.',
            photoUrl: 'http://localhost:9000/ecom/pages/ugc-2.jpg',
          },
        ],
      },
    },
  },
  {
    type: 'FAQ',
    title: 'FAQ (Accordion)',
    description:
      'Pre-empts last-mile objections about shipping, sizing, warranty, returns. Uses native <details> — no JS, no bundle cost, works before hydration.',
    when: 'Near the bottom of landing pages and product-detail pages. Reduces support tickets.',
    badges: ['content', 'objection-handling'],
    json: {
      id: 'faq-1',
      type: 'FAQ',
      props: {
        title: 'Frequently asked questions',
        subtitle: 'Still curious? Our support team replies within 2 hours.',
        items: [
          {
            question: 'How long does shipping take?',
            answer: 'Standard: 2-4 business days in Vietnam. Express next-day is available at checkout for major cities.',
          },
          {
            question: 'What is your return policy?',
            answer: '30-day money-back guarantee. Item must be unused with original tags. Return shipping is on us if the item is defective.',
          },
          {
            question: 'Is my payment secure?',
            answer: 'Yes. All transactions go through PCI-DSS compliant payment gateways (MoMo, VNPAY, VISA/Mastercard). We never see your card number.',
          },
          {
            question: 'Do you ship internationally?',
            answer: 'Not yet. We currently ship within Vietnam. Sign up for the newsletter to be notified when international shipping launches.',
          },
        ],
      },
    },
  },
  {
    type: 'Newsletter',
    title: 'Newsletter signup',
    description:
      'Lead capture in exchange for a discount code. Sits well as either a landing-page block OR permanently in the footer (the footer already includes it — this block is for landing-page prominence).',
    when: 'Bottom of landing page, before FAQ. Also good as a mid-scroll interrupt on long product pages.',
    badges: ['conversion', 'lead-capture'],
    json: {
      id: 'newsletter-1',
      type: 'Newsletter',
      props: {
        title: 'Get 10% off your first order',
        subtitle: "Join 5,000+ subscribers for early access to sales and new drops.",
        discountLabel: '-10% OFF',
        discountCode: 'WELCOME10',
        layout: 'boxed', // 'boxed' | 'inline'
      },
    },
  },
];

const FULL_PAGE_EXAMPLE = {
  blocks: [
    {
      id: 'hero-1',
      type: 'HeroBanner',
      props: {
        bannerPosition: 'home_hero',
        headline: 'Summer collection is here',
        subHeadline: 'Free shipping over $50 + easy 30-day returns.',
        ctaLabel: 'Shop the drop',
        ctaHref: '/products',
        align: 'center',
        aspect: 'wide',
      },
    },
    {
      id: 'trust',
      type: 'TrustBadges',
      props: {
        variant: 'strip',
        items: [
          { icon: 'Truck', title: 'Free shipping', subtitle: 'Orders over $50' },
          { icon: 'ShieldCheck', title: 'Secure checkout', subtitle: 'PCI-DSS compliant' },
          { icon: 'RefreshCcw', title: 'Easy returns', subtitle: '30-day money back' },
          { icon: 'Headphones', title: '24/7 support', subtitle: 'We reply in 2h' },
        ],
      },
    },
    {
      id: 'categories',
      type: 'CategoryList',
      props: { parentId: null, limit: 6, layout: 'grid', showImage: true },
    },
    {
      id: 'grid-featured',
      type: 'ProductGrid',
      props: {
        source: 'tag',
        tagId: 'REPLACE_WITH_TAG_ID',
        limit: 8,
        columns: 4,
        title: 'Featured products',
        subtitle: 'Hand-picked by our team.',
        cardBadge: 'Featured',
      },
    },
    {
      id: 'testimonials',
      type: 'Testimonials',
      props: {
        title: 'Loved by 2,000+ shoppers',
        items: [
          { name: 'Minh N.', rating: 5, quote: 'Delivery was fast and packaging was on point.' },
          { name: 'Lan T.', rating: 5, quote: 'Quality exceeded expectations for the price.' },
          { name: 'Duc P.', rating: 4, quote: 'Great value. Wish more colors were in stock.' },
        ],
      },
    },
    {
      id: 'flash-sale',
      type: 'FlashSaleCountdown',
      props: {
        endAt: '2026-12-31T23:59:59.000Z',
        title: '⚡ Flash Sale',
        productIds: ['REPLACE_1', 'REPLACE_2', 'REPLACE_3'],
        hideAfterEnd: true,
      },
    },
    {
      id: 'newsletter',
      type: 'Newsletter',
      props: {
        title: 'Get 10% off your first order',
        subtitle: 'Join 5,000+ subscribers for early access to sales.',
        discountLabel: '-10% OFF',
        discountCode: 'WELCOME10',
        layout: 'boxed',
      },
    },
    {
      id: 'faq',
      type: 'FAQ',
      props: {
        title: 'Frequently asked questions',
        items: [
          { question: 'How long does shipping take?', answer: 'Standard: 2-4 business days. Express next-day available at checkout.' },
          { question: 'What is your return policy?', answer: '30-day money-back guarantee. Return shipping on us if item is defective.' },
          { question: 'Is my payment secure?', answer: 'Yes — PCI-DSS compliant gateways (MoMo, VNPAY, VISA/MC). We never see your card.' },
        ],
      },
    },
  ],
};

const CATEGORIES = ['Media', 'Catalog', 'Content', 'Layout', 'Trust', 'Conversion'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_MAP: Record<string, Category> = {
  HeroBanner: 'Media',
  BannerSlider: 'Media',
  ImageBlock: 'Media',
  ProductGrid: 'Catalog',
  FlashSaleCountdown: 'Catalog',
  CategoryList: 'Catalog',
  RichText: 'Content',
  TextColumns: 'Content',
  Divider: 'Layout',
  CTAButton: 'Conversion',
  Newsletter: 'Conversion',
  TrustBadges: 'Trust',
  Testimonials: 'Trust',
  FAQ: 'Trust',
};

export default function TemplatesPage() {
  const [category, setCategory] = useState<Category | 'All'>('All');

  const filtered = TEMPLATES.filter(
    (t) => category === 'All' || CATEGORY_MAP[t.type] === category,
  );

  return (
    <>
      <PageHeader
        title="Page block templates"
        description="Reference library of every block you can add to a page's Layout JSON. Copy the snippet from any card and paste into the layout field."
        breadcrumbs={
          <Link
            href="/admin/pages"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to Pages
          </Link>
        }
      />

      <Tabs value={category} onValueChange={(v) => setCategory(v as Category | 'All')} className="mb-6">
        <TabsList>
          <TabsTrigger value="All">All ({TEMPLATES.length})</TabsTrigger>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c}>
              {c} ({TEMPLATES.filter((t) => CATEGORY_MAP[t.type] === c).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((t, i) => (
          <TemplateCard key={`${t.type}-${i}`} template={t} />
        ))}
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <LayoutTemplate className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Full page example</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Copy this into a new page's Layout JSON to bootstrap a home-style layout. Replace the
          placeholder IDs with real IDs from your catalog before publishing.
        </p>
        <JsonCard json={FULL_PAGE_EXAMPLE} label="Full home layout" />
      </div>
    </>
  );
}

function TemplateCard({ template }: { template: BlockTemplate }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{template.title}</CardTitle>
            <code className="mt-0.5 text-xs text-muted-foreground">type: "{template.type}"</code>
          </div>
          <div className="flex flex-wrap gap-1">
            {template.badges.map((b) => (
              <Badge key={b} variant="outline" className="text-xs">
                {b}
              </Badge>
            ))}
          </div>
        </div>
        <CardDescription className="mt-2">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">When to use:</span> {template.when}
        </p>
        <JsonCard json={template.json} label={template.title} />
      </CardContent>
    </Card>
  );
}

function JsonCard({ json, label }: { json: unknown; label: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(json, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: `Copied "${label}" JSON`, variant: 'success' });
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      toast({
        title: 'Copy failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="relative rounded-md border bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={copy}
        className="absolute right-1 top-1 h-7 gap-1 px-2 text-xs"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <pre className="overflow-x-auto p-3 pr-16 text-xs">
        <code>{text}</code>
      </pre>
    </div>
  );
}
