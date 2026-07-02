import Link from 'next/link';
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter, Youtube } from 'lucide-react';
import { Separator } from '@ecom/ui';
import type { MenuItem } from '@ecom/shared';
import { getMenusByPosition } from '@/lib/storefront-api';
import { NewsletterForm } from './blocks/newsletter.client';

/**
 * Storefront footer with 4-column grid:
 *   1. Brand + tagline + newsletter signup
 *   2-3. Two columns from the FOOTER menu (Shop / Help)
 *   4. Contact info + social icons
 *
 * Falls back gracefully when the FOOTER menu isn't configured. All columns
 * are semantically labeled so screen readers can jump between them.
 */
export async function SiteFooter() {
  const menus = (await getMenusByPosition('FOOTER')) ?? [];
  const items = (menus[0]?.hierarchyJson as MenuItem[] | undefined) ?? [];
  const year = new Date().getFullYear();

  // First two top-level items become the middle columns. Rest are ignored
  // to keep the layout consistent regardless of editor structure.
  const [colA, colB] = items;

  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <BrandColumn />
          {colA ? <MenuColumn item={colA} /> : <PlaceholderColumn heading="Shop" />}
          {colB ? <MenuColumn item={colB} /> : <PlaceholderColumn heading="Help" />}
          <ContactColumn />
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} Ecom. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/refund" className="hover:text-foreground">Refund policy</Link>
            <Link href="/shipping" className="hover:text-foreground">Shipping</Link>
          </div>
          <PaymentIcons />
        </div>
      </div>
    </footer>
  );
}

function BrandColumn() {
  return (
    <div>
      <div className="flex items-center gap-2 font-semibold">
        <span className="inline-block size-7 rounded-md bg-primary" />
        <span>Ecom</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Curated products delivered fast, backed by a 30-day money-back guarantee.
      </p>
      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Get 10% off
        </h3>
        <NewsletterForm discountCode="WELCOME10" />
      </div>
    </div>
  );
}

function MenuColumn({ item }: { item: MenuItem }) {
  const children = Array.isArray(item.children) ? item.children : [];
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{item.label}</h3>
      {children.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {children.map((c, i) => (
            <li key={i}>
              <Link
                href={c.url}
                target={c.target ?? '_self'}
                className="text-muted-foreground hover:text-foreground"
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Link
          href={item.url}
          target={item.target ?? '_self'}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {item.label}
        </Link>
      )}
    </div>
  );
}

function PlaceholderColumn({ heading }: { heading: string }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{heading}</h3>
      <p className="text-xs text-muted-foreground">
        Configure a FOOTER menu with children to fill this column.
      </p>
    </div>
  );
}

function ContactColumn() {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Get in touch</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <Phone className="mt-0.5 size-4 shrink-0" />
          <a href="tel:+84900000000" className="hover:text-foreground">
            +84 900 000 000
          </a>
        </li>
        <li className="flex items-start gap-2">
          <Mail className="mt-0.5 size-4 shrink-0" />
          <a href="mailto:hello@ecom.local" className="hover:text-foreground">
            hello@ecom.local
          </a>
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>Ho Chi Minh City, Vietnam</span>
        </li>
      </ul>
      <div className="mt-5 flex gap-3">
        <SocialLink href="https://facebook.com" label="Facebook" Icon={Facebook} />
        <SocialLink href="https://instagram.com" label="Instagram" Icon={Instagram} />
        <SocialLink href="https://twitter.com" label="Twitter" Icon={Twitter} />
        <SocialLink href="https://youtube.com" label="YouTube" Icon={Youtube} />
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: typeof Facebook;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
    >
      <Icon className="size-4" />
    </a>
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
