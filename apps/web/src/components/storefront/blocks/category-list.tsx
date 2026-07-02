import Link from 'next/link';
import { cn } from '@ecom/ui';
import { getCategoryTree } from '@/lib/storefront-api';
import type { CategoryTreeNode } from '@ecom/shared';

interface Props {
  parentId?: unknown; // null = root categories
  limit?: unknown;
  layout?: unknown; // 'grid' | 'list'
  showImage?: unknown;
}

export async function CategoryListBlock(props: Props) {
  const tree = (await getCategoryTree()) ?? [];
  const parentId = typeof props.parentId === 'string' ? props.parentId : null;

  const list: CategoryTreeNode[] =
    parentId === null
      ? tree
      : (findNode(tree, parentId)?.children ?? []);

  const limit = normalizeLimit(props.limit, 6);
  const showImage = props.showImage !== false;
  const layout = props.layout === 'list' ? 'list' : 'grid';
  const items = list.slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div
        className={cn(
          layout === 'grid'
            ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6'
            : 'flex flex-col divide-y rounded-lg border',
        )}
      >
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/c/${c.slug}`}
            className={cn(
              'group rounded-lg border bg-card p-3 text-center transition-shadow hover:shadow-md',
              layout === 'list' && 'border-0 text-left',
            )}
          >
            {showImage && c.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.imageUrl}
                alt=""
                className="mx-auto mb-2 size-16 rounded-full object-cover"
              />
            ) : showImage ? (
              <div className="mx-auto mb-2 size-16 rounded-full bg-muted" />
            ) : null}
            <div className="text-sm font-medium group-hover:text-primary">{c.name}</div>
            <div className="text-xs text-muted-foreground">
              {c.productCount} product{c.productCount === 1 ? '' : 's'}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function findNode(tree: CategoryTreeNode[], id: string): CategoryTreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function normalizeLimit(v: unknown, def: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 && n <= 50 ? Math.floor(n) : def;
}
