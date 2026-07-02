'use client';

import { useEffect, useState } from 'react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ecom/ui';
import { apiFetch } from '@/lib/api-client';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

type Option = { id: string; label: string; href: string };

/**
 * Multi-mode link input:
 *   - internal: hand-typed path like `/products` (validated by the storefront router)
 *   - external: any absolute URL
 *   - page:     pick from CMS pages by slug
 *   - category: pick from category tree
 *   - product:  pick from active products
 *
 * The resolved value is always a URL string — mode is UI-only so editors can
 * choose from a list instead of memorizing IDs/paths.
 */
export function LinkPicker({ value, onChange }: Props) {
  const [mode, setMode] = useState<'external' | 'internal' | 'page' | 'category' | 'product'>(
    detectMode(value),
  );

  return (
    <div className="space-y-2">
      <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="internal">Internal path (e.g. /products)</SelectItem>
          <SelectItem value="external">External URL (https://…)</SelectItem>
          <SelectItem value="page">Pick a CMS page</SelectItem>
          <SelectItem value="category">Pick a category</SelectItem>
          <SelectItem value="product">Pick a product</SelectItem>
        </SelectContent>
      </Select>

      {mode === 'internal' || mode === 'external' ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === 'external' ? 'https://example.com/promo' : '/products'}
          className="h-9"
        />
      ) : null}
      {mode === 'page' ? <PageOptions value={value} onChange={onChange} /> : null}
      {mode === 'category' ? <CategoryOptions value={value} onChange={onChange} /> : null}
      {mode === 'product' ? <ProductOptions value={value} onChange={onChange} /> : null}
    </div>
  );
}

function detectMode(v: string): 'external' | 'internal' | 'page' | 'category' | 'product' {
  if (!v) return 'internal';
  if (/^https?:\/\//i.test(v)) return 'external';
  if (v.startsWith('/c/')) return 'category';
  if (v.startsWith('/p/')) return 'product';
  return 'internal';
}

function PageOptions({ value, onChange }: Props) {
  const [pages, setPages] = useState<Array<{ slug: string; title: string }>>([]);

  useEffect(() => {
    apiFetch<{ items: Array<{ slug: string; title: string; status: string }> }>('/pages?pageSize=200')
      .then((r) => setPages(r.items.filter((p) => p.status === 'PUBLISHED').map((p) => ({ slug: p.slug, title: p.title }))))
      .catch(() => setPages([]));
  }, []);

  const current = value.startsWith('/') && !value.startsWith('/c/') && !value.startsWith('/p/') ? value.replace(/^\//, '') : '';

  return (
    <Select
      value={current || '__none'}
      onValueChange={(v) => onChange(v === '__none' ? '' : `/${v}`)}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Choose a page" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">(none)</SelectItem>
        {pages.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No published pages.</div>
        ) : null}
        {pages.map((p) => (
          <SelectItem key={p.slug} value={p.slug}>
            {p.title} <span className="text-muted-foreground">/{p.slug}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CategoryOptions({ value, onChange }: Props) {
  const [cats, setCats] = useState<Option[]>([]);

  useEffect(() => {
    apiFetch<Array<{ id: string; name: string; slug: string; children: unknown[] }>>('/categories/tree')
      .then((tree) => setCats(flatten(tree)))
      .catch(() => setCats([]));
  }, []);

  function flatten(nodes: Array<{ id: string; name: string; slug: string; children: unknown[] }>, depth = 0): Option[] {
    const out: Option[] = [];
    for (const n of nodes) {
      out.push({ id: n.id, label: `${'— '.repeat(depth)}${n.name}`, href: `/c/${n.slug}` });
      const children = n.children as Array<{ id: string; name: string; slug: string; children: unknown[] }>;
      out.push(...flatten(children, depth + 1));
    }
    return out;
  }

  return (
    <Select
      value={value || '__none'}
      onValueChange={(v) => onChange(v === '__none' ? '' : v)}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Choose a category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">(none)</SelectItem>
        {cats.map((c) => (
          <SelectItem key={c.id} value={c.href}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ProductOptions({ value, onChange }: Props) {
  const [products, setProducts] = useState<Option[]>([]);

  useEffect(() => {
    apiFetch<{ items: Array<{ id: string; title: string; slug: string }> }>('/products?pageSize=200&status=ACTIVE')
      .then((r) =>
        setProducts(r.items.map((p) => ({ id: p.id, label: p.title, href: `/p/${p.slug}` }))),
      )
      .catch(() => setProducts([]));
  }, []);

  return (
    <Select
      value={value || '__none'}
      onValueChange={(v) => onChange(v === '__none' ? '' : v)}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Choose a product" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">(none)</SelectItem>
        {products.map((p) => (
          <SelectItem key={p.id} value={p.href}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

