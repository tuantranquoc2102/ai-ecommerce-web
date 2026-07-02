'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  title: string;
  endAt: string;
  hideAfterEnd: boolean;
  children?: ReactNode;
}

/**
 * Countdown to `endAt`. Deliberately defers reading the clock until AFTER
 * the first client render — otherwise SSR would compute `Date.now()` at
 * time T1, ship HTML with those digits, and the client would hydrate at
 * T2 with different digits, causing a hydration mismatch.
 *
 * Instead: server renders "--:--:--:--" placeholder; the effect kicks in
 * on mount, sets `now`, and the tick interval takes over from there.
 */
export function FlashSaleClient({ title, endAt, hideAfterEnd, children }: Props) {
  // `null` = pre-hydration or first paint. Real value set in the effect below.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const end = new Date(endAt).getTime();
  const remaining = now === null ? null : Math.max(0, end - now);
  const ended = remaining === 0;

  // Once hydrated AND the deadline has passed, honor the hide flag.
  if (remaining !== null && ended && hideAfterEnd) return null;

  const days = remaining === null ? null : Math.floor(remaining / 86_400_000);
  const hours = remaining === null ? null : Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = remaining === null ? null : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? null : Math.floor((remaining % 60_000) / 1000);

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="rounded-lg border bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {ended ? (
            <span className="text-sm text-muted-foreground">Ended</span>
          ) : (
            // suppressHydrationWarning: the whole `.tabular-nums` wrapper is
            // fine to differ between SSR (placeholders) and first client
            // render (real numbers) because it's inherently time-based.
            <div className="flex items-center gap-2 tabular-nums" suppressHydrationWarning>
              <TimeChunk value={days} label="d" />
              <span className="text-muted-foreground">:</span>
              <TimeChunk value={hours} label="h" />
              <span className="text-muted-foreground">:</span>
              <TimeChunk value={minutes} label="m" />
              <span className="text-muted-foreground">:</span>
              <TimeChunk value={seconds} label="s" />
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function TimeChunk({ value, label }: { value: number | null; label: string }) {
  const display = value === null ? '--' : String(value).padStart(2, '0');
  return (
    <div className="min-w-[3.25rem] rounded-md bg-background px-2 py-1 text-center shadow-sm">
      <div className="text-lg font-semibold leading-none" suppressHydrationWarning>
        {display}
      </div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}
