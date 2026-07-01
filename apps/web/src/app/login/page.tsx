'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
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
import { apiFetch, tokenStore } from '@/lib/api-client';
import { invalidatePermissionCache } from '@/lib/permissions';
import type { LoginResult } from '@ecom/shared';

export default function LoginPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('admin@ecom.local');
  const [password, setPassword] = useState('ChangeMe!123');
  const [ticket, setTicket] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        toast({
          title: 'Two-factor required',
          description: 'Enter your 6-digit code from your authenticator app.',
        });
      } else {
        tokenStore.write(result.tokens);
        document.cookie = `ecom.session=1; path=/; max-age=${60 * 60 * 24 * 30}`;
        invalidatePermissionCache();
        window.location.href = '/admin';
      }
    } catch (e) {
      setError((e as Error).message);
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
        document.cookie = `ecom.session=1; path=/; max-age=${60 * 60 * 24 * 30}`;
        invalidatePermissionCache();
        window.location.href = '/admin';
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            {ticket
              ? 'Enter the 6-digit code from your authenticator.'
              : 'Use your admin credentials to access the CMS.'}
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
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setTicket(null);
                  setCode('');
                  setError(null);
                }}
              >
                Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
