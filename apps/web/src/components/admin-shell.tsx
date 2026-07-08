'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import {
  BarChart3,
  Box,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  ListTree,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Users,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Avatar,
  AvatarFallback,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@ecom/ui';
import { logout as apiLogout } from '@/lib/api-client';
import { invalidatePermissionCache } from '@/lib/permissions';

interface NavLeaf {
  href: Route;
  label: string;
}

type NavEntry =
  | { type: 'link'; href: Route; label: string; icon: ReactNode }
  | { type: 'section'; label: string; icon: ReactNode; children: NavLeaf[] };

interface NavGroup {
  heading: string;
  entries: NavEntry[];
}

const NAV: NavGroup[] = [
  {
    heading: 'Tổng quan',
    entries: [
      { type: 'link', href: '/admin', label: 'Tổng quan', icon: <LayoutDashboard className="size-4" /> },
    ],
  },
  {
    heading: 'Vận hành cốt lõi',
    entries: [
      {
        type: 'section',
        label: 'Đơn hàng',
        icon: <ShoppingBag className="size-4" />,
        children: [
          { href: '/admin/orders', label: 'Tất cả đơn hàng' },
          { href: '/admin/orders/processing', label: 'Chờ xử lý / Chuẩn bị hàng' },
          { href: '/admin/orders/shipping', label: 'Đang giao / Hoàn thành' },
          { href: '/admin/orders/returns', label: 'Trả hàng / Hoàn tiền' },
        ],
      },
      {
        type: 'section',
        label: 'Sản phẩm',
        icon: <Box className="size-4" />,
        children: [
          { href: '/admin/products', label: 'Danh sách sản phẩm' },
          { href: '/admin/products/new', label: 'Thêm sản phẩm mới' },
          { href: '/admin/categories', label: 'Danh mục & Thương hiệu' },
          { href: '/admin/inventory', label: 'Quản lý kho' },
        ],
      },
      {
        type: 'section',
        label: 'Khách hàng',
        icon: <Users className="size-4" />,
        children: [
          { href: '/admin/customers', label: 'Danh sách khách hàng' },
          { href: '/admin/customers/groups', label: 'Nhóm khách hàng' },
          { href: '/admin/reviews', label: 'Đánh giá & Phản hồi' },
        ],
      },
    ],
  },
  {
    heading: 'Phát triển kinh doanh',
    entries: [
      {
        type: 'section',
        label: 'Marketing',
        icon: <Megaphone className="size-4" />,
        children: [
          { href: '/admin/marketing/coupons', label: 'Mã giảm giá' },
          { href: '/admin/marketing/promotions', label: 'Chương trình khuyến mãi' },
        ],
      },
      {
        type: 'section',
        label: 'Báo cáo & Phân tích',
        icon: <BarChart3 className="size-4" />,
        children: [
          { href: '/admin/analytics/sales', label: 'Báo cáo doanh thu' },
          { href: '/admin/analytics/behavior', label: 'Hành vi khách hàng' },
          { href: '/admin/analytics/products', label: 'Hiệu suất sản phẩm' },
        ],
      },
    ],
  },
  {
    heading: 'Cấu hình & Hệ thống',
    entries: [
      {
        type: 'section',
        label: 'Người dùng & Phân quyền',
        icon: <ShieldCheck className="size-4" />,
        children: [
          { href: '/admin/users', label: 'Danh sách nhân viên' },
          { href: '/admin/roles', label: 'Vai trò' },
          { href: '/admin/resources', label: 'Phân quyền' },
        ],
      },
      {
        type: 'section',
        label: 'Cấu hình hệ thống',
        icon: <Settings className="size-4" />,
        children: [
          { href: '/admin/settings/footer', label: 'Footer' },
          { href: '/admin/settings/payments', label: 'Cổng thanh toán' },
          { href: '/admin/settings/shipping', label: 'Đơn vị vận chuyển' },
          { href: '/admin/settings', label: 'Cài đặt chung' },
        ],
      },
    ],
  },
  {
    heading: 'Nội dung',
    entries: [
      { type: 'link', href: '/admin/pages', label: 'Trang', icon: <FileText className="size-4" /> },
      { type: 'link', href: '/admin/block-templates', label: 'Mẫu khối', icon: <LayoutTemplate className="size-4" /> },
      { type: 'link', href: '/admin/menus', label: 'Menu', icon: <ListTree className="size-4" /> },
      { type: 'link', href: '/admin/banners', label: 'Banner', icon: <ImageIcon className="size-4" /> },
      { type: 'link', href: '/admin/tags', label: 'Thẻ', icon: <Tag className="size-4" /> },
    ],
  },
];

/** All leaf hrefs, flattened — used to resolve the single active route. */
const ALL_HREFS: Route[] = NAV.flatMap((group) =>
  group.entries.flatMap((entry) =>
    entry.type === 'link' ? [entry.href] : entry.children.map((c) => c.href),
  ),
);

/**
 * The active route is the leaf whose href is the longest prefix of the current
 * path. Longest-match avoids double-highlighting when one href is a prefix of
 * another (e.g. `/admin/settings` vs `/admin/settings/payments`).
 */
function activeHrefFor(pathname: string | null): Route | null {
  if (!pathname) return null;
  let best: Route | null = null;
  for (const href of ALL_HREFS) {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function DesktopSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="size-7 rounded-md bg-primary" />
        <span className="text-sm font-semibold">Ecom CMS</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <SidebarNav pathname={pathname} />
      </nav>
      <div className="p-3 text-xs text-muted-foreground">v0.1.0</div>
    </aside>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  const active = activeHrefFor(pathname);
  return (
    <div className="space-y-4">
      {NAV.map((group) => (
        <div key={group.heading} className="space-y-1">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.heading}
          </p>
          {group.entries.map((entry) =>
            entry.type === 'link' ? (
              <NavLink
                key={entry.href}
                href={entry.href}
                label={entry.label}
                icon={entry.icon}
                active={active === entry.href}
                onNavigate={onNavigate}
              />
            ) : (
              <NavSection key={entry.label} entry={entry} active={active} onNavigate={onNavigate} />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

function NavSection({
  entry,
  active,
  onNavigate,
}: {
  entry: Extract<NavEntry, { type: 'section' }>;
  active: Route | null;
  onNavigate?: () => void;
}) {
  const containsActive = entry.children.some((c) => c.href === active);
  const [open, setOpen] = useState(containsActive);

  // Keep the section expanded whenever navigation lands on one of its children.
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          containsActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        {entry.icon}
        <span className="flex-1 text-left">{entry.label}</span>
        <ChevronDown className={cn('size-3.5 opacity-60 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="mt-1 space-y-1 border-l border-border pl-3 ml-4">
          {entry.children.map((child) => (
            <NavLink
              key={child.href}
              href={child.href}
              label={child.label}
              active={active === child.href}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  nested,
  onNavigate,
}: {
  href: Route;
  label: string;
  icon?: ReactNode;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        nested ? 'font-normal' : 'font-medium',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <MobileMenu />
      <div className="ml-auto flex items-center gap-3">
        <UserMenu />
      </div>
    </header>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="size-7 rounded-md bg-primary" />
          <span className="text-sm font-semibold">Ecom CMS</span>
        </div>
        <nav className="overflow-y-auto p-3">
          <SidebarNav pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function UserMenu() {
  async function logout() {
    // Revoke the refresh token + clear the stored JWTs before dropping the
    // session cookie, otherwise the account stays authenticated (API calls and
    // the storefront header would still see a live session).
    await apiLogout();
    invalidatePermissionCache();
    document.cookie = 'ecom.session=; path=/; max-age=0';
    window.location.href = '/login';
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <Avatar>
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm sm:inline">Admin</span>
          <ChevronDown className="size-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/settings">
            <Settings className="size-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive">
          <LogOut className="size-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

