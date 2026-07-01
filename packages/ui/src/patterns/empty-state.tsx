import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Lucide icon component or any ReactNode rendered at ~48px. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Primary action (e.g., "Create your first product"). */
  action?: ReactNode;
}

/**
 * Empty state for tables, lists, search results. ALWAYS render an action when
 * the user can resolve the emptiness (create something), or omit `action` if
 * the result is genuinely zero (no search match).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-8 text-center',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
