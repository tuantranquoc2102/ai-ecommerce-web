'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@ecom/ui';
import { apiFetch } from '@/lib/api-client';

interface OptionRow {
  id: string;
  label: string;
  sublabel?: string;
}

// ---------------------------------------------------------------------------
// CategoryPicker — single category ID
// ---------------------------------------------------------------------------

export function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [items, setItems] = useState<OptionRow[]>([]);
  useEffect(() => {
    apiFetch<Array<{ id: string; name: string; children: unknown[] }>>('/categories/tree')
      .then((tree) => setItems(flatten(tree)))
      .catch(() => setItems([]));
  }, []);
  function flatten(nodes: Array<{ id: string; name: string; children: unknown[] }>, depth = 0): OptionRow[] {
    const out: OptionRow[] = [];
    for (const n of nodes) {
      out.push({ id: n.id, label: `${'— '.repeat(depth)}${n.name}` });
      const children = n.children as Array<{ id: string; name: string; children: unknown[] }>;
      out.push(...flatten(children, depth + 1));
    }
    return out;
  }
  return (
    <Select value={value || '__none'} onValueChange={(v) => onChange(v === '__none' ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Choose category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">(none)</SelectItem>
        {items.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// TagPicker — single tag ID
// ---------------------------------------------------------------------------

export function TagPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [tags, setTags] = useState<OptionRow[]>([]);
  useEffect(() => {
    apiFetch<{ items: Array<{ id: string; name: string }> }>('/tags?pageSize=200')
      .then((r) => setTags(r.items.map((t) => ({ id: t.id, label: t.name }))))
      .catch(() => setTags([]));
  }, []);
  return (
    <Select value={value || '__none'} onValueChange={(v) => onChange(v === '__none' ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Choose tag" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">(none)</SelectItem>
        {tags.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// ProductPicker — single or multi product ID
// ---------------------------------------------------------------------------

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  mainImage: string | null;
}

export function ProductPicker({
  value,
  onChange,
  multiple,
}: {
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multiple?: boolean;
}) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    apiFetch<{ items: ProductRow[] }>('/products?pageSize=200&status=ACTIVE')
      .then((r) => setProducts(r.items))
      .catch(() => setProducts([]));
  }, []);

  if (!multiple) {
    return (
      <Select
        value={(value as string) || '__none'}
        onValueChange={(v) => onChange(v === '__none' ? '' : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">(none)</SelectItem>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const selected = Array.isArray(value) ? value : [];
  const selectedProducts = products.filter((p) => selected.includes(p.id));
  const remaining = products.filter((p) => !selected.includes(p.id));

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {selectedProducts.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedProducts.map((p) => (
            <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
              {p.title}
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="rounded-sm p-0.5 hover:bg-background/40"
                aria-label={`Remove ${p.title}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No products picked yet.</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setPickerOpen((o) => !o)}
      >
        {pickerOpen ? 'Hide product list' : 'Add products'}
      </Button>

      {pickerOpen ? (
        <div className="max-h-52 overflow-y-auto rounded border">
          {remaining.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">All products selected.</p>
          ) : (
            <ul className="divide-y">
              {remaining.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {p.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BannerPositionPicker — free-form text with autocomplete from existing slots
// ---------------------------------------------------------------------------

export function BannerPositionPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [positions, setPositions] = useState<string[]>([]);
  useEffect(() => {
    apiFetch<{ items: Array<{ position: string }> }>('/banners?pageSize=200')
      .then((r) => setPositions(Array.from(new Set(r.items.map((b) => b.position)))))
      .catch(() => setPositions([]));
  }, []);
  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'home_hero'}
        list="banner-positions"
      />
      <datalist id="banner-positions">
        {positions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColorInput — hex text + presets + swatch preview
// ---------------------------------------------------------------------------

export function ColorInput({
  value,
  onChange,
  presets,
}: {
  value: string;
  onChange: (v: string) => void;
  presets?: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border bg-transparent"
          aria-label="Color picker"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff (leave blank to inherit)"
          className="h-9 flex-1 font-mono text-xs"
        />
      </div>
      {presets && presets.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                'size-6 rounded border shadow-sm',
                value.toLowerCase() === p.toLowerCase() && 'ring-2 ring-primary ring-offset-1',
              )}
              style={{ backgroundColor: p }}
              aria-label={`Set color ${p}`}
              title={p}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
