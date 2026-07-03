import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button, cn } from '@ecom/ui';
import type { MenuItem } from '@ecom/shared';
import { getMenusByPosition } from '@/lib/storefront-api';
import { CartButton } from './cart-button';
import { AccountMenu } from './account-menu';

/**
 * Storefront header. Renders the first HEADER menu tree horizontally with
 * up-to-one level of nesting shown as hover dropdowns.
 *
 * Deliberately server-rendered — HTML ships with menu items inline for SEO
 * and no client-side flicker while the nav loads.
 */
export async function SiteHeader() {
  const menus = (await getMenusByPosition('HEADER')) ?? [];
  const items = (menus[0]?.hierarchyJson as MenuItem[] | undefined) ?? [];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block size-7 rounded-md bg-primary" />
          <span>Ecom</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {items.map((item, i) => (
            <TopNavItem key={i} item={item} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search className="size-4" />
          </Button>
          <CartButton />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

function TopNavItem({ item }: { item: MenuItem }) {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  return (
    <div className="group relative">
      <Link
        href={item.url}
        target={item.target ?? '_self'}
        className={cn(
          'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground',
          'hover:bg-accent hover:text-foreground',
        )}
      >
        {item.label}
      </Link>
      {hasChildren ? (
        <div
          className={cn(
            'absolute left-0 top-full min-w-[12rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
            'invisible opacity-0 transition-opacity',
            'group-hover:visible group-hover:opacity-100',
          )}
        >
          {item.children!.map((c, i) => (
            <Link
              key={i}
              href={c.url}
              target={c.target ?? '_self'}
              className="block rounded-sm px-3 py-2 text-sm hover:bg-accent"
            >
              {c.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
