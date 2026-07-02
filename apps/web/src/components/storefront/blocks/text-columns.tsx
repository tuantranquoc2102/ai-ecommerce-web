import { cn } from '@ecom/ui';
import * as icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ColumnItem {
  icon?: string;
  heading: string;
  body: string;
}

interface Props {
  columns?: unknown; // 2 | 3 | 4
  items?: unknown;
}

export function TextColumnsBlock(props: Props) {
  const columns = props.columns === 2 || props.columns === 4 ? props.columns : 3;
  const items = Array.isArray(props.items) ? (props.items as unknown[]) : [];
  const validItems = items.filter(
    (it): it is ColumnItem =>
      !!it &&
      typeof it === 'object' &&
      typeof (it as ColumnItem).heading === 'string' &&
      typeof (it as ColumnItem).body === 'string',
  );

  if (validItems.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div
        className={cn(
          'grid gap-6',
          columns === 2 && 'sm:grid-cols-2',
          columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
          columns === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
        )}
      >
        {validItems.map((item, i) => (
          <TextColumnItem key={i} item={item} />
        ))}
      </div>
    </section>
  );
}

function TextColumnItem({ item }: { item: ColumnItem }) {
  const Icon = resolveIcon(item.icon);
  return (
    <div className="text-center">
      {Icon ? (
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{item.heading}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
    </div>
  );
}

/**
 * Look up a Lucide icon by name. Only string keys of the module that point to
 * a valid React component (i.e., have a displayName). Prevents arbitrary
 * export access via untrusted layoutJson.
 */
function resolveIcon(name: unknown): LucideIcon | null {
  if (typeof name !== 'string' || !name) return null;
  const record = icons as unknown as Record<string, LucideIcon | undefined>;
  const value = record[name];
  return typeof value === 'function' || (typeof value === 'object' && value !== null)
    ? (value as LucideIcon)
    : null;
}
