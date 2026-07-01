'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import {
  Box,
  ChevronDown,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  Tag,
  Users,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
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

interface NavItem {
  href: Route;
  label: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { href: '/admin/products', label: 'Products', icon: <Box className="size-4" /> },
  { href: '/admin/categories', label: 'Categories', icon: <FolderTree className="size-4" /> },
  { href: '/admin/tags', label: 'Tags', icon: <Tag className="size-4" /> },
  { href: '/admin/orders', label: 'Orders', icon: <ShoppingBag className="size-4" /> },
  { href: '/admin/users', label: 'Users', icon: <Users className="size-4" /> },
  { href: '/admin/settings', label: 'Settings', icon: <Settings className="size-4" /> },
];

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
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>
      <div className="p-3 text-xs text-muted-foreground">v0.1.0</div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {item.icon}
      {item.label}
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
        <nav className="space-y-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function UserMenu() {
  function logout() {
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

function isActive(pathname: string | null, href: Route) {
  if (!pathname) return false;
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}
