import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Page title — h1, typographically prominent. */
  title: ReactNode;
  /** Optional supporting copy below the title. */
  description?: ReactNode;
  /** Right-aligned actions (Buttons, MenuTriggers). */
  actions?: ReactNode;
  /** Breadcrumb / back link slot, rendered above the title. */
  breadcrumbs?: ReactNode;
}

/**
 * Standard page header. EVERY admin screen starts with this — it guarantees
 * consistent title typography, action placement, and spacing.
 *
 *   <PageHeader
 *     title="Products"
 *     description="Manage your storefront catalog."
 *     actions={<Button>New product</Button>}
 *   />
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 space-y-3', className)} {...props}>
      {breadcrumbs ? <div className="text-sm text-muted-foreground">{breadcrumbs}</div> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
