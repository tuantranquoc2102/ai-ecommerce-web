'use client';

import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Input } from '@ecom/ui';

export function NewsletterForm({ discountCode }: { discountCode: string | null }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setErrMsg('Enter a valid email address.');
      return;
    }
    setStatus('submitting');
    setErrMsg(null);
    // Backend /newsletter/subscribe lands in M2.4. For now, fake success so the
    // UX and hand-off contract is settled — swap out this stub then.
    await new Promise((r) => setTimeout(r, 600));
    setStatus('success');
  }

  if (status === 'success') {
    return (
      <div className="mt-6 rounded-lg border bg-card p-5 text-left shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-success">
          <Check className="size-4" /> You're on the list
        </div>
        <p className="text-sm text-muted-foreground">
          Welcome! We've sent a confirmation email to <strong>{email}</strong>.
          {discountCode ? (
            <>
              {' '}Your code:{' '}
              <code className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                {discountCode}
              </code>
            </>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === 'error') setStatus('idle');
        }}
        className="h-12 flex-1 text-base"
        aria-label="Email address"
        aria-invalid={status === 'error'}
        required
      />
      <Button
        type="submit"
        size="lg"
        disabled={status === 'submitting'}
        className="h-12 px-6 text-base font-semibold"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing you up
          </>
        ) : (
          'Subscribe'
        )}
      </Button>
      {status === 'error' && errMsg ? (
        <p className="mt-1 w-full text-xs text-destructive sm:mt-0 sm:basis-full">{errMsg}</p>
      ) : null}
    </form>
  );
}
