'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, User } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  useToast,
} from '@ecom/ui';
import type { AuthUserView, LoginResult } from '@ecom/shared';
import { ApiError, apiFetch, tokenStore } from '@/lib/api-client';
import { invalidatePermissionCache } from '@/lib/permissions';

// Permission that guards the admin dashboard (see middleware.ts). Staff who
// hold it (ADMIN / SUPER_ADMIN) are sent to the CMS instead of the storefront.
const ADMIN_DASHBOARD_PERM = 'menu.dashboard';

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const search = useSearchParams();
  const router = useRouter();
  const next = search.get('next') ?? '/account';
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ticket, setTicket] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Route based on who signed in: admin staff go to the CMS dashboard (setting
  // the session cookie the admin middleware gates on), shoppers continue to the
  // storefront. Uses a full navigation for the admin case so the admin shell
  // and its server-gated routes load fresh.
  function completeLogin(user: AuthUserView) {
    if (user.permissions.includes(ADMIN_DASHBOARD_PERM)) {
      document.cookie = `ecom.session=1; path=/; max-age=${60 * 60 * 24 * 30}`;
      invalidatePermissionCache();
      window.location.href = '/admin';
      return;
    }
    router.push(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<LoginResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        auth: false,
      });
      if (result.stage === 'TWO_FACTOR_REQUIRED') {
        setTicket(result.ticket);
        toast({ title: 'Two-factor required', description: 'Enter your 6-digit code.' });
      } else {
        tokenStore.write(result.tokens);
        completeLogin(result.user);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit2fa(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<LoginResult>('/auth/login/2fa', {
        method: 'POST',
        body: JSON.stringify({ ticket, code }),
        auth: false,
      });
      if (result.stage === 'COMPLETE') {
        tokenStore.write(result.tokens);
        completeLogin(result.user);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-5" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            {ticket ? 'Enter your 6-digit authenticator code.' : 'Sign in to view your orders and speed up checkout.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ticket ? (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Sign in
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                New here?{' '}
                <Link
                  href={{ pathname: '/account/register', query: { next } }}
                  className="font-semibold text-foreground hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={submit2fa} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  pattern="\d{6}"
                  autoComplete="one-time-code"
                  required
                  className="text-center text-lg tracking-[0.5em]"
                />
              </div>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Verify
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setTicket(null)}>
                Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
