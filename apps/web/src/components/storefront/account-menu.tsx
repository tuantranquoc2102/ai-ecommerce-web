'use client';

import Link from 'next/link';
import { LogIn, User } from 'lucide-react';
import { Button } from '@ecom/ui';
import { useCurrentCustomer } from '@/lib/storefront/current-user-hook';

/**
 * Header slot for account/sign-in. Renders as a "Sign in" button by default
 * (matches the SSR HTML), then swaps to a user avatar link once the client
 * detects a valid session. suppressHydrationWarning tolerates the flip.
 */
export function AccountMenu() {
  const { user, loading } = useCurrentCustomer();

  if (loading || !user) {
    return (
      <Button variant="outline" size="sm" asChild suppressHydrationWarning>
        <Link href="/account/login">
          <LogIn className="size-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      </Button>
    );
  }

  const initials =
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() ||
    user.email[0]?.toUpperCase();

  return (
    <Button variant="ghost" size="sm" asChild className="gap-2">
      <Link href="/account">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials ?? <User className="size-3" />}
        </span>
        <span className="hidden sm:inline">Account</span>
      </Link>
    </Button>
  );
}
