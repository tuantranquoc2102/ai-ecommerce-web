'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  FolderTree,
  ImageOff,
  Mail,
  Star,
} from 'lucide-react';
import * as icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Card, cn } from '@ecom/ui';
import { apiFetch } from '@/lib/api-client';

/**
 * Live client-side preview of a single CMS block, mirroring the storefront
 * render but simplified to work inside admin sheets:
 *   - No async server data fetches — data-driven blocks use `apiFetch` from
 *     the client and public storefront endpoints.
 *   - Interactive elements are neutered (`pointer-events-none` on wrapper) so
 *     buttons inside the preview don't navigate or fire toasts.
 *   - Height is capped by the container so the preview never grows unbounded.
 *
 * Usage:
 *   <BlockPreview type="HeroBanner" props={{ headline: 'Hi', ... }} />
 *
 * Callers should wrap this in a scroll container if they want to guarantee
 * a max height (e.g. 320px). The block itself uses relative units.
 */

interface Props {
  type: string;
  props: Record<string, unknown>;
  /** If true, renders a compact height-limited version suitable for cards. */
  compact?: boolean;
}

export function BlockPreview({ type, props, compact }: Props) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border bg-background',
        // Neutralise ALL clicks/hovers inside the preview so it never fires
        // storefront navigation or toasts by accident.
        'pointer-events-none select-none',
        compact && 'aspect-video',
      )}
    >
      <div
        className={cn(
          'origin-top-left',
          compact ? 'h-full w-[200%] scale-[0.5]' : 'w-full',
        )}
      >
        <BlockRender type={type} props={props} />
      </div>
    </div>
  );
}

function BlockRender({ type, props }: { type: string; props: Record<string, unknown> }) {
  switch (type) {
    case 'HeroBanner':
      return <HeroBannerPreview {...props} />;
    case 'BannerSlider':
      return <BannerSliderPreview {...props} />;
    case 'ProductGrid':
      return <ProductGridPreview {...props} />;
    case 'CategoryList':
      return <CategoryListPreview {...props} />;
    case 'FlashSaleCountdown':
      return <FlashSalePreview {...props} />;
    case 'Testimonials':
      return <TestimonialsPreview {...props} />;
    case 'TrustBadges':
      return <TrustBadgesPreview {...props} />;
    case 'Newsletter':
      return <NewsletterPreview {...props} />;
    case 'FAQ':
      return <FaqPreview {...props} />;
    case 'RichText':
      return <RichTextPreview {...props} />;
    case 'ImageBlock':
      return <ImageBlockPreview {...props} />;
    case 'CTAButton':
      return <CtaButtonPreview {...props} />;
    case 'TextColumns':
      return <TextColumnsPreview {...props} />;
    case 'Divider':
      return <DividerPreview {...props} />;
    default:
      return (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No preview available for &quot;{type}&quot;.
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function boolFlag(v: unknown, def: boolean): boolean {
  if (v === true) return true;
  if (v === false) return false;
  return def;
}

function resolveIcon(name: unknown): LucideIcon | null {
  if (typeof name !== 'string' || !name) return null;
  const record = icons as unknown as Record<string, LucideIcon | undefined>;
  const value = record[name];
  return typeof value === 'function' || (typeof value === 'object' && value !== null)
    ? (value as LucideIcon)
    : null;
}

/**
 * "This block loads data from…" placeholder used while an async fetch is in
 * flight or when the config is incomplete.
 */
function PreviewPlaceholder({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
      <div className="flex size-8 items-center justify-center rounded-full bg-muted [&_svg]:size-4">
        {icon}
      </div>
      <div className="font-medium text-foreground">{title}</div>
      {hint ? <p className="max-w-xs text-[11px]">{hint}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeroBanner
// ---------------------------------------------------------------------------

interface Banner {
  imageUrl: string;
  targetUrl: string | null;
  altText: string | null;
}

function HeroBannerPreview(props: Record<string, unknown>) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);

  const explicitImage = str(props.image);
  const position = str(props.bannerPosition);

  useEffect(() => {
    if (explicitImage || !position) {
      setBanner(null);
      return;
    }
    setLoading(true);
    apiFetch<Banner[]>(`/banners/active/${encodeURIComponent(position)}`, { auth: false })
      .then((r) => setBanner(r?.[0] ?? null))
      .catch(() => setBanner(null))
      .finally(() => setLoading(false));
  }, [explicitImage, position]);

  const imageUrl = explicitImage ?? banner?.imageUrl ?? null;

  const headline = boolFlag(props.headline_show, true) ? str(props.headline) : null;
  const sub = boolFlag(props.subHeadline_show, true) ? str(props.subHeadline) : null;
  const ctaLabel = boolFlag(props.cta_show, true) ? str(props.cta_label) : null;
  const ctaHref = boolFlag(props.cta_show, true) ? str(props.cta_href) : null;
  const secondaryLabel = boolFlag(props.secondaryCta_show, true) ? str(props.secondaryCta_label) : null;

  const align = props.align === 'left' ? 'items-start text-left' : 'items-center text-center';
  const aspect =
    props.aspect === 'square'
      ? 'aspect-[4/3]'
      : props.aspect === 'tall'
        ? 'aspect-[3/4]'
        : 'aspect-[21/9]';

  const hasOverlay = !!(headline || sub || ctaLabel || secondaryLabel);
  const headlineColor = str(props.headline_color);
  const subColor = str(props.subHeadline_color);
  const headlineFontSize = str(props.headline_fontSize);
  const subFontSize = str(props.subHeadline_fontSize);

  return (
    <div className={cn('relative w-full overflow-hidden rounded-lg bg-muted', aspect)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : loading ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Loading banner…
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          <ImageOff className="mr-2 size-4" />
          {position ? `No active banner at "${position}"` : 'No image or banner position set'}
        </div>
      )}

      {hasOverlay ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          <div className={cn('absolute inset-0 flex px-6 py-8', align, 'justify-center')}>
            <div className="max-w-xl text-white">
              {headline ? (
                <h1
                  className={cn(
                    'font-bold leading-tight tracking-tight',
                    headlineFontSize ?? 'text-3xl md:text-5xl',
                  )}
                  style={headlineColor ? { color: headlineColor } : undefined}
                >
                  {headline}
                </h1>
              ) : null}
              {sub ? (
                <p
                  className={cn('mt-2 text-white/90', subFontSize ?? 'text-base')}
                  style={subColor ? { color: subColor } : undefined}
                >
                  {sub}
                </p>
              ) : null}
              {ctaLabel && ctaHref ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow">
                  {ctaLabel} <ArrowRight className="size-4" />
                </div>
              ) : null}
              {secondaryLabel ? (
                <div className="ml-2 mt-4 inline-flex items-center rounded-md border border-white/60 bg-white/10 px-6 py-2 text-sm font-semibold text-white">
                  {secondaryLabel}
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BannerSlider (renders first slide statically)
// ---------------------------------------------------------------------------

function BannerSliderPreview(props: Record<string, unknown>) {
  const slides = Array.isArray(props.slides) ? (props.slides as Array<Record<string, unknown>>) : [];
  const first = slides[0];

  if (!first || !str(first.image)) {
    return (
      <PreviewPlaceholder
        icon={<ImageOff />}
        title={`${slides.length} slide${slides.length === 1 ? '' : 's'} configured`}
        hint={
          slides.length === 0
            ? 'Add slides in the editor below to preview.'
            : 'First slide needs an image to render.'
        }
      />
    );
  }

  return (
    <div className="relative">
      <HeroBannerPreview {...first} align="center" />
      {slides.length > 1 ? (
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">
          1 / {slides.length}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductGrid
// ---------------------------------------------------------------------------

interface PreviewProduct {
  id: string;
  title: string;
  slug: string;
  mainImage: string | null;
  basePrice: string;
  salePrice: string | null;
}

function ProductGridPreview(props: Record<string, unknown>) {
  const source = str(props.source) ?? 'category';
  const categoryId = str(props.categoryId);
  const tagId = str(props.tagId);
  const productIds = Array.isArray(props.productIds)
    ? (props.productIds as unknown[]).filter((v): v is string => typeof v === 'string')
    : [];
  const limit = Math.min(Math.max(Number(props.limit) || 8, 1), 12);
  const columns = Number(props.columns) === 2 || Number(props.columns) === 3 ? Number(props.columns) : 4;
  const title = str(props.title);
  const subtitle = str(props.subtitle);
  const badge = str(props.cardBadge);

  const [products, setProducts] = useState<PreviewProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReason(null);

    (async () => {
      try {
        if (source === 'manual') {
          const cleaned = productIds.filter((id) => id && !id.startsWith('REPLACE'));
          if (cleaned.length === 0) {
            if (!cancelled) {
              setProducts([]);
              setReason('Pick products in the editor to preview.');
            }
            return;
          }
          const qs = encodeURIComponent(cleaned.join(','));
          const r = await apiFetch<PreviewProduct[]>(`/products/public/by-ids?ids=${qs}`, { auth: false });
          if (!cancelled) {
            const list = r ?? [];
            const byId = new Map(list.map((p) => [p.id, p]));
            setProducts(cleaned.map((id) => byId.get(id)).filter((p): p is PreviewProduct => !!p).slice(0, limit));
          }
        } else {
          const filterKey = source === 'tag' ? 'tagId' : 'categoryId';
          const filterVal = source === 'tag' ? tagId : categoryId;
          if (!filterVal || filterVal.startsWith('REPLACE')) {
            if (!cancelled) {
              setProducts([]);
              setReason(`Pick a ${source} in the editor to preview.`);
            }
            return;
          }
          const r = await apiFetch<{ items: PreviewProduct[] }>(
            `/products/public/list?${filterKey}=${encodeURIComponent(filterVal)}&pageSize=${limit}`,
            { auth: false },
          );
          if (!cancelled) setProducts(r?.items ?? []);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, categoryId, tagId, JSON.stringify(productIds), limit]);

  return (
    <div className="p-4">
      {title || subtitle ? (
        <div className="mb-4 text-center">
          {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      ) : null}
      {loading ? (
        <div className={cn('grid gap-2', gridColsClass(columns))}>
          {Array.from({ length: Math.min(limit, columns * 2) }).map((_, i) => (
            <div key={i} className="animate-pulse rounded border bg-card">
              <div className="aspect-square bg-muted" />
              <div className="space-y-2 p-2">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <PreviewPlaceholder
          icon={<ImageOff />}
          title="Empty grid"
          hint={reason ?? 'No products match this filter.'}
        />
      ) : (
        <div className={cn('grid gap-2', gridColsClass(columns))}>
          {products.slice(0, limit).map((p) => (
            <div key={p.id} className="overflow-hidden rounded border bg-card">
              <div className="aspect-square bg-muted">
                {p.mainImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.mainImage} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="p-2">
                {badge ? (
                  <Badge variant="default" className="mb-1 text-[10px]">
                    {badge}
                  </Badge>
                ) : null}
                <div className="line-clamp-2 text-xs font-medium">{p.title}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  {p.salePrice ? (
                    <>
                      <span className="text-xs font-semibold text-primary">${p.salePrice}</span>
                      <span className="text-[10px] text-muted-foreground line-through">${p.basePrice}</span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold">${p.basePrice}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function gridColsClass(cols: number): string {
  return cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : 'grid-cols-4';
}

// ---------------------------------------------------------------------------
// CategoryList
// ---------------------------------------------------------------------------

interface PreviewCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
  parentId: string | null;
  children: PreviewCategory[];
}

function CategoryListPreview(props: Record<string, unknown>) {
  const parentId = str(props.parentId);
  const limit = Math.min(Math.max(Number(props.limit) || 6, 1), 12);
  const showImage = boolFlag(props.showImage, true);

  const [cats, setCats] = useState<PreviewCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<PreviewCategory[]>('/categories/public/tree', { auth: false })
      .then((r) => {
        if (cancelled) return;
        const roots = r ?? [];
        if (parentId) {
          const parent = findParent(roots, parentId);
          setCats(parent?.children ?? []);
        } else {
          setCats(roots);
        }
      })
      .catch(() => setCats([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded border bg-muted" />
        ))}
      </div>
    );
  }
  if (cats.length === 0) {
    return <PreviewPlaceholder icon={<FolderTree />} title="No categories to show" />;
  }

  return (
    <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4">
      {cats.slice(0, limit).map((c) => (
        <div key={c.id} className="rounded border bg-card p-2 text-center">
          {showImage ? (
            c.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageUrl} alt="" className="mx-auto mb-1 size-10 rounded-full object-cover" />
            ) : (
              <div className="mx-auto mb-1 size-10 rounded-full bg-muted" />
            )
          ) : null}
          <div className="text-xs font-medium">{c.name}</div>
          <div className="text-[10px] text-muted-foreground">{c.productCount} products</div>
        </div>
      ))}
    </div>
  );
}

function findParent(nodes: PreviewCategory[], id: string): PreviewCategory | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findParent(n.children, id);
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// FlashSale
// ---------------------------------------------------------------------------

function FlashSalePreview(props: Record<string, unknown>) {
  const title = str(props.title) ?? '⚡ Flash Sale';
  const endAt = str(props.endAt);
  const remaining = endAt ? Math.max(0, new Date(endAt).getTime() - Date.now()) : 0;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  return (
    <div className="rounded-lg border bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex gap-1 tabular-nums text-sm">
          <TimeBlock v={days} l="d" />
          <span className="text-muted-foreground">:</span>
          <TimeBlock v={hours} l="h" />
          <span className="text-muted-foreground">:</span>
          <TimeBlock v={minutes} l="m" />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Product grid appears here on the storefront.</p>
    </div>
  );
}

function TimeBlock({ v, l }: { v: number; l: string }) {
  return (
    <div className="rounded bg-background px-2 py-1 text-center shadow-sm">
      <div className="font-semibold leading-none">{String(v).padStart(2, '0')}</div>
      <div className="text-[9px] uppercase text-muted-foreground">{l}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

function TestimonialsPreview(props: Record<string, unknown>) {
  const title = str(props.title) ?? 'Loved by shoppers';
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];

  if (items.length === 0) {
    return <PreviewPlaceholder icon={<Star />} title="No testimonials yet" />;
  }

  return (
    <div className="p-4">
      <h2 className="mb-3 text-center text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {items.slice(0, 3).map((t, i) => {
          const rating = Math.min(5, Math.max(1, Math.round(Number(t.rating) || 5)));
          return (
            <Card key={i} className="p-3">
              <div className="mb-1 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={cn(
                      'size-3',
                      s < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40',
                    )}
                  />
                ))}
              </div>
              <p className="line-clamp-3 text-[11px]">&quot;{str(t.quote)}&quot;</p>
              <div className="mt-2 text-xs font-medium">{str(t.name)}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrustBadges
// ---------------------------------------------------------------------------

function TrustBadgesPreview(props: Record<string, unknown>) {
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];
  if (items.length === 0) return <PreviewPlaceholder icon={<Star />} title="No badges yet" />;
  const variant = str(props.variant) ?? 'strip';

  return (
    <div className="p-4">
      <div
        className={cn(
          'rounded-lg border bg-card',
          variant === 'strip'
            ? 'grid grid-cols-2 divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0'
            : 'grid grid-cols-2 gap-3 p-3 sm:grid-cols-4',
        )}
      >
        {items.slice(0, 4).map((b, i) => {
          const Icon = resolveIcon(str(b.icon));
          return (
            <div key={i} className="flex items-center gap-2 p-3">
              {Icon ? (
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{str(b.title) ?? '(no title)'}</div>
                {str(b.subtitle) ? (
                  <div className="truncate text-[10px] text-muted-foreground">{str(b.subtitle)}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

function NewsletterPreview(props: Record<string, unknown>) {
  const title = str(props.title) ?? 'Get 10% off';
  const subtitle = str(props.subtitle);
  const discountLabel = str(props.discountLabel);
  const boxed = str(props.layout) !== 'inline';

  const inner = (
    <div className="text-center">
      <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Mail className="size-4" />
      </div>
      {discountLabel ? (
        <span className="mb-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {discountLabel}
        </span>
      ) : null}
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mx-auto mt-3 flex max-w-sm gap-2">
        <div className="h-8 flex-1 rounded border bg-background px-2 text-xs leading-loose text-muted-foreground">
          you@example.com
        </div>
        <div className="rounded bg-primary px-3 text-xs font-semibold leading-loose text-primary-foreground">
          Subscribe
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4">
      {boxed ? (
        <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-background p-6">{inner}</div>
      ) : (
        inner
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

function FaqPreview(props: Record<string, unknown>) {
  const title = str(props.title) ?? 'Frequently asked questions';
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];

  if (items.length === 0) {
    return <PreviewPlaceholder icon={<ChevronDown />} title="No questions yet" />;
  }

  return (
    <div className="p-4">
      <h2 className="mb-3 text-center text-lg font-semibold">{title}</h2>
      <div className="divide-y rounded border bg-card">
        {items.slice(0, 3).map((it, i) => (
          <div key={i} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium">{str(it.question)}</span>
              <ChevronDown className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
            </div>
            {i === 0 && str(it.answer) ? (
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{str(it.answer)}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RichText
// ---------------------------------------------------------------------------

function RichTextPreview(props: Record<string, unknown>) {
  const html = str(props.html);
  if (!html) {
    return <PreviewPlaceholder icon={<ImageOff />} title="No content" />;
  }
  return (
    <div
      className={cn(
        'p-4 text-sm',
        '[&_h1]:mt-3 [&_h1]:text-xl [&_h1]:font-semibold',
        '[&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold',
        '[&_h3]:mt-3 [&_h3]:font-semibold',
        '[&_p]:my-2 [&_p]:leading-relaxed',
        '[&_a]:text-primary [&_a]:underline',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ---------------------------------------------------------------------------
// ImageBlock
// ---------------------------------------------------------------------------

function ImageBlockPreview(props: Record<string, unknown>) {
  const url = str(props.url);
  const alt = str(props.alt) ?? '';
  const caption = str(props.caption);
  if (!url) return <PreviewPlaceholder icon={<ImageOff />} title="No image" />;
  return (
    <div className="p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className="w-full rounded object-cover" />
      {caption ? <p className="mt-2 text-center text-xs text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CTAButton
// ---------------------------------------------------------------------------

function CtaButtonPreview(props: Record<string, unknown>) {
  const label = str(props.label);
  if (!label) return <PreviewPlaceholder icon={<ArrowRight />} title="No label" />;
  const variant = str(props.variant) ?? 'default';
  const classes =
    variant === 'outline'
      ? 'border border-input bg-background text-foreground'
      : variant === 'secondary'
        ? 'bg-secondary text-secondary-foreground'
        : variant === 'ghost'
          ? 'bg-transparent text-foreground'
          : 'bg-primary text-primary-foreground';
  return (
    <div className="p-6 text-center">
      <span className={cn('inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold shadow', classes)}>
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TextColumns
// ---------------------------------------------------------------------------

function TextColumnsPreview(props: Record<string, unknown>) {
  const columns = Number(props.columns) === 2 || Number(props.columns) === 4 ? Number(props.columns) : 3;
  const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];
  if (items.length === 0) return <PreviewPlaceholder icon={<Star />} title="No columns yet" />;
  return (
    <div className={cn('grid gap-4 p-4', columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
      {items.slice(0, columns).map((c, i) => {
        const Icon = resolveIcon(str(c.icon));
        return (
          <div key={i} className="text-center">
            {Icon ? (
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
            ) : null}
            <div className="text-sm font-semibold">{str(c.heading) ?? '(no heading)'}</div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{str(c.body) ?? ''}</p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

function DividerPreview(props: Record<string, unknown>) {
  const label = str(props.label);
  const thick = str(props.thickness) === 'thick';
  return (
    <div className="p-4">
      {label ? (
        <div className="flex items-center gap-3">
          <hr className={cn('flex-1', thick ? 'border-t-2' : 'border-t')} />
          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">{label}</span>
          <hr className={cn('flex-1', thick ? 'border-t-2' : 'border-t')} />
        </div>
      ) : (
        <hr className={thick ? 'border-t-2' : 'border-t'} />
      )}
    </div>
  );
}
