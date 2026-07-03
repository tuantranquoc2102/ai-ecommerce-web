'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut, PackageOpen, User } from 'lucide-react';
import { Button, Card, Separator } from '@ecom/ui';
import { useCurrentCustomer } from '@/lib/storefront/current-user-hook';

/**
 * Storefront account landing. Minimal in M3.3 — just profile summary + links.
 * Address book and password change land later. Redirects unauthenticated
 * visitors to /account/login.
 */
export default function AccountPage() {
  const { user, loading, signOut } = useCurrentCustomer();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/account/login?next=/account');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Your account'}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex size-8 items-center justify-center rounded-md bg-muted">
              <PackageOpen className="size-4" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Orders</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Track shipments and review past purchases.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/account/orders">View orders</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex size-8 items-center justify-center rounded-md bg-muted">
              <User className="size-4" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Profile</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Email + password management arrive in a later milestone.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-destructive hover:text-destructive"
                onClick={() => {
                  signOut();
                  router.push('/');
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Separator className="my-6" />
      <Button asChild variant="outline">
        <Link href="/products">Continue shopping</Link>
      </Button>
    </div>
  );
}
