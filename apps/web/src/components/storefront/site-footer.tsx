import Link from 'next/link';
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { Separator } from '@ecom/ui';
import {
  DEFAULT_FOOTER_CONFIG,
  type FooterColumn,
  type FooterConfig,
  type SocialLink as SocialLinkData,
  type SocialPlatform,
} from '@ecom/shared';
import { getFooterConfig } from '@/lib/storefront-api';
import { NewsletterForm } from './blocks/newsletter.client';

/**
 * Storefront footer, fully driven by the admin-editable `footer` setting
 * (Admin → Cấu hình → Footer). Columns, their content, social links, the grid
 * width and the bottom bar all come from config; falls back to the baseline
 * layout when the setting hasn't been configured or the API is unreachable.
 */
export async function SiteFooter() {
  const config: FooterConfig = (await getFooterConfig()) ?? DEFAULT_FOOTER_CONFIG;
  const year = new Date().getFullYear();
  const gridCols = GRID_COLS[config.columnsPerRow] ?? GRID_COLS[4];

  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className={`grid gap-8 md:grid-cols-2 ${gridCols}`}>
          {config.columns.map((col) => (
            <FooterColumnView key={col.id} col={col} />
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p>{config.bottom.copyright.replace('{year}', String(year))}</p>
          {config.bottom.links.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-4">
              {config.bottom.links.map((l, i) => (
                <Link
                  key={i}
                  href={l.url}
                  target={l.target}
                  className="hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ) : null}
          <PaymentIcons />
        </div>
      </div>
    </footer>
  );
}

const GRID_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

function FooterColumnView({ col }: { col: FooterColumn }) {
  switch (col.type) {
    case 'brand':
      return <BrandColumn col={col} />;
    case 'text':
      return <TextColumn col={col} />;
    case 'contact':
      return <ContactColumn col={col} />;
    case 'social':
      return <SocialColumn col={col} />;
    case 'links':
    default:
      return <LinksColumn col={col} />;
  }
}

function ColumnHeading({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <h3 className="mb-3 text-sm font-semibold">{children}</h3>;
}

function BrandColumn({ col }: { col: FooterColumn }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-semibold">
        <span className="inline-block size-7 rounded-md bg-primary" />
        <span>{col.brandName || 'Ecom'}</span>
      </div>
      {col.brandTagline ? (
        <p className="mt-3 text-sm text-muted-foreground">{col.brandTagline}</p>
      ) : null}
      {col.showNewsletter ? (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Get 10% off
          </h3>
          <NewsletterForm discountCode={col.newsletterDiscountCode || 'WELCOME10'} />
        </div>
      ) : null}
    </div>
  );
}

function LinksColumn({ col }: { col: FooterColumn }) {
  return (
    <div>
      <ColumnHeading>{col.title}</ColumnHeading>
      {col.links.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {col.links.map((l, i) => (
            <li key={i}>
              <Link
                href={l.url}
                target={l.target}
                className="text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TextColumn({ col }: { col: FooterColumn }) {
  return (
    <div>
      <ColumnHeading>{col.title}</ColumnHeading>
      {col.text ? (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{col.text}</p>
      ) : null}
    </div>
  );
}

function ContactColumn({ col }: { col: FooterColumn }) {
  return (
    <div>
      <ColumnHeading>{col.title || 'Get in touch'}</ColumnHeading>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {col.phone ? (
          <li className="flex items-start gap-2">
            <Phone className="mt-0.5 size-4 shrink-0" />
            <a href={`tel:${col.phone.replace(/\s+/g, '')}`} className="hover:text-foreground">
              {col.phone}
            </a>
          </li>
        ) : null}
        {col.email ? (
          <li className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 shrink-0" />
            <a href={`mailto:${col.email}`} className="hover:text-foreground">
              {col.email}
            </a>
          </li>
        ) : null}
        {col.address ? (
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span>{col.address}</span>
          </li>
        ) : null}
      </ul>
      {col.socials.length > 0 ? <SocialRow socials={col.socials} className="mt-5" /> : null}
    </div>
  );
}

function SocialColumn({ col }: { col: FooterColumn }) {
  return (
    <div>
      <ColumnHeading>{col.title}</ColumnHeading>
      <SocialRow socials={col.socials} />
    </div>
  );
}

const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  website: Globe,
};

function SocialRow({ socials, className }: { socials: SocialLinkData[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ''}`}>
      {socials.map((s, i) => {
        const Icon = SOCIAL_ICONS[s.platform] ?? Globe;
        return (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.platform}
            className="flex size-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
}

function PaymentIcons() {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
      <span className="rounded bg-muted-foreground/10 px-2 py-1 text-muted-foreground">VISA</span>
      <span className="rounded bg-muted-foreground/10 px-2 py-1 text-muted-foreground">MC</span>
      <span className="rounded bg-muted-foreground/10 px-2 py-1 text-muted-foreground">MoMo</span>
      <span className="rounded bg-muted-foreground/10 px-2 py-1 text-muted-foreground">VNPAY</span>
    </div>
  );
}
