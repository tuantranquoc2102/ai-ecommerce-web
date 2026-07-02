import * as icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@ecom/ui';

interface TrustBadge {
  icon?: string;
  title: string;
  subtitle?: string;
}

interface Props {
  items?: unknown;
  variant?: unknown; // 'strip' | 'grid' — strip is horizontal bar, grid is 3/4 col cards
}

/**
 * TrustBadges block — a compact row of "why buy from us" reassurances.
 * Free shipping, secure checkout, easy returns, 24/7 support etc. Meant to
 * sit right under the hero to inoculate the visitor against friction.
 */
export function TrustBadgesBlock(props: Props) {
  const items = Array.isArray(props.items) ? (props.items as unknown[]) : [];
  const valid = items.filter(
    (it): it is TrustBadge =>
      !!it && typeof it === 'object' && typeof (it as TrustBadge).title === 'string',
  );
  if (valid.length === 0) return null;

  const variant = props.variant === 'grid' ? 'grid' : 'strip';

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div
        className={cn(
          'rounded-lg border bg-card',
          variant === 'strip'
            ? 'grid grid-cols-2 divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0'
            : 'grid grid-cols-2 gap-6 p-6 sm:grid-cols-3 lg:grid-cols-4',
        )}
      >
        {valid.map((b, i) => (
          <TrustBadgeItem key={i} badge={b} variant={variant} />
        ))}
      </div>
    </section>
  );
}

function TrustBadgeItem({
  badge,
  variant,
}: {
  badge: TrustBadge;
  variant: 'strip' | 'grid';
}) {
  const Icon = resolveIcon(badge.icon);
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        variant === 'strip' ? 'p-4 sm:p-5' : 'flex-col text-center',
      )}
    >
      {Icon ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className={variant === 'grid' ? '' : 'min-w-0'}>
        <div className="text-sm font-semibold">{badge.title}</div>
        {badge.subtitle ? (
          <div className="text-xs text-muted-foreground">{badge.subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}

function resolveIcon(name: unknown): LucideIcon | null {
  if (typeof name !== 'string' || !name) return null;
  const record = icons as unknown as Record<string, LucideIcon | undefined>;
  const value = record[name];
  return typeof value === 'function' || (typeof value === 'object' && value !== null)
    ? (value as LucideIcon)
    : null;
}
