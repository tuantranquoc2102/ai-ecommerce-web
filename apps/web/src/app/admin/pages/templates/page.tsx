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
    title: 'Hero Banner',
    description:
      'Single large image at the top of a page. Pulls one active banner from the given position slot; deactivates automatically per schedule.',
    when: 'Homepage hero, landing page top, campaign page opener.',
    badges: ['banners', 'single-image'],
    json: {
      id: 'hero-1',
      type: 'HeroBanner',
      props: {
        bannerPosition: 'home_hero',
        aspect: 'wide', // wide | square | tall
        overlay: true, // dim + text overlay
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
];

const FULL_PAGE_EXAMPLE = {
  blocks: [
    {
      id: 'hero-1',
      type: 'HeroBanner',
      props: { bannerPosition: 'home_hero', aspect: 'wide', overlay: true },
    },
    {
      id: 'categories',
      type: 'CategoryList',
      props: { parentId: null, limit: 6, layout: 'grid', showImage: true },
    },
    {
      id: 'divider-1',
      type: 'Divider',
      props: { label: 'Featured products', thickness: 'thin' },
    },
    {
      id: 'grid-featured',
      type: 'ProductGrid',
      props: { source: 'tag', tagId: 'REPLACE_WITH_TAG_ID', limit: 8, columns: 4 },
    },
    {
      id: 'features',
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
      id: 'cta',
      type: 'CTAButton',
      props: {
        label: 'Shop all products',
        href: '/products',
        variant: 'default',
        size: 'lg',
      },
    },
  ],
};

const CATEGORIES = ['Media', 'Catalog', 'Content', 'Layout'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_MAP: Record<string, Category> = {
  HeroBanner: 'Media',
  BannerSlider: 'Media',
  ProductGrid: 'Catalog',
  FlashSaleCountdown: 'Catalog',
  CategoryList: 'Catalog',
  RichText: 'Content',
  ImageBlock: 'Content',
  CTAButton: 'Content',
  TextColumns: 'Layout',
  Divider: 'Layout',
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
