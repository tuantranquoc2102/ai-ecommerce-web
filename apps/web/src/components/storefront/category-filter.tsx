'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@ecom/ui';
import type { CategoryTreeNode } from '@ecom/shared';

interface Props {
  tree: CategoryTreeNode[];
  active?: string;
}

/**
 * Storefront category sidebar with per-node expand/collapse. A node is
 * expanded on first render when it (or any descendant) matches the active
 * category, so entering the page with `/products/c/<slug>` shows the whole
 * ancestor path opened. Leaves render without a chevron.
 *
 * Categories link to path-based routes (`/products/c/<slug>`) rather than a
 * query param, which is friendlier for SEO and gives Google a cleaner
 * canonical per category page.
 *
 * The chevron toggles children; the label is still a link that filters.
 * Kept as a small client component so the surrounding page can stay a
 * server component and paginate/filter via URL params without hydration
 * fanning out beyond this sidebar.
 */
export function CategoryFilter({ tree, active }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => initialExpanded(tree, active));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="space-y-2 text-sm">
      <h2 className="mb-2 font-semibold">Categories</h2>
      <Link
        href="/products"
        className={
          !active
            ? 'block rounded-md bg-accent px-2 py-1 font-medium'
            : 'block rounded-md px-2 py-1 text-muted-foreground hover:text-foreground'
        }
      >
        All
      </Link>
      {tree.length === 0 ? (
        <p className="text-xs text-muted-foreground">No categories yet.</p>
      ) : (
        <ul className="space-y-0.5">
          {tree.map((c) => (
            <CategoryNode
              key={c.id}
              node={c}
              active={active}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}

function CategoryNode({
  node,
  active,
  depth,
  expanded,
  onToggle,
}: {
  node: CategoryTreeNode;
  active?: string;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isActive = active === node.id;

  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-0.5 rounded-md',
          isActive ? 'bg-accent' : 'hover:bg-accent/50',
        )}
        style={{ paddingLeft: depth * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
            aria-expanded={isOpen}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}
        <Link
          href={`/c/${node.slug}`}
          className={cn(
            'block flex-1 rounded-md py-1 pr-2',
            isActive ? 'font-medium' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {node.name}
          {node.productCount > 0 ? (
            <span className="ml-1 text-xs text-muted-foreground">({node.productCount})</span>
          ) : null}
        </Link>
      </div>
      {hasChildren && isOpen ? (
        <ul className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              active={active}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Walks the tree and collects the IDs on every ancestor path leading to the
 * active category, so those branches open by default. When no category is
 * selected we start fully collapsed to keep the sidebar compact.
 */
function initialExpanded(tree: CategoryTreeNode[], active?: string): Set<string> {
  const out = new Set<string>();
  if (!active) return out;
  const walk = (nodes: CategoryTreeNode[]): boolean => {
    for (const n of nodes) {
      if (n.id === active) return true;
      if (walk(n.children)) {
        out.add(n.id);
        return true;
      }
    }
    return false;
  };
  walk(tree);
  return out;
}
