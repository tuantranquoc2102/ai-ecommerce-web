'use client';

import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { BlockSchema, Field } from '@ecom/shared';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea, cn } from '@ecom/ui';
import { ImageUpload } from '@/components/image-upload';
import { BannerPositionPicker, CategoryPicker, ColorInput, ProductPicker, TagPicker } from './pickers';
import { LinkPicker } from './link-picker';

interface Props {
  schema: BlockSchema;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

/**
 * Renders a form for editing a block's props based on its BlockSchema.
 * Dispatches to the right control per field type. Recursive for arrays.
 *
 * Two contract subtleties:
 *   - `showIfKey` on a field means "hide this field if the sibling boolean
 *     keyed by showIfKey is false". Used for headline_show → hide color/font.
 *   - For ProductGrid's `source_is_category/tag/manual` computed keys —
 *     these are synthesized on the fly here because `source` is a Select,
 *     not a boolean.
 */
export function PropertyEditor({ schema, value, onChange }: Props) {
  return (
    <div className="space-y-5">
      {schema.fields.map((f) => (
        <FieldRow key={f.key} field={f} value={value} onChange={onChange} />
      ))}
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  parentKey,
}: {
  field: Field;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  parentKey?: string;
}) {
  // Conditional visibility based on `showIfKey`.
  if (field.showIfKey && !isVisible(field.showIfKey, value)) {
    return null;
  }

  const key = parentKey ? `${parentKey}.${field.key}` : field.key;
  const current = value[field.key];

  function update(next: unknown) {
    onChange({ ...value, [field.key]: next });
  }

  const labelEl = (
    <div className="flex items-baseline gap-2">
      <label className="text-sm font-medium">{field.label}</label>
      {field.description ? (
        <span className="text-xs text-muted-foreground">{field.description}</span>
      ) : null}
    </div>
  );

  switch (field.type) {
    case 'text':
      return (
        <div className="space-y-1.5" data-field={key}>
          {labelEl}
          <Input
            value={typeof current === 'string' ? current : ''}
            onChange={(e) => update(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
          />
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Textarea
            rows={field.rows ?? 3}
            value={typeof current === 'string' ? current : ''}
            onChange={(e) => update(e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={typeof current === 'number' ? current : Number(current) || 0}
              onChange={(e) => update(Number(e.target.value))}
              className="w-40"
            />
            {field.suffix ? (
              <span className="text-xs text-muted-foreground">{field.suffix}</span>
            ) : null}
          </div>
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">{field.label}</div>
            {field.description ? (
              <div className="text-xs text-muted-foreground">{field.description}</div>
            ) : null}
          </div>
          <Switch checked={!!current} onCheckedChange={(v) => update(v)} />
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Select
            value={current === undefined || current === null ? '' : String(current)}
            onValueChange={(v) => {
              // Coerce numeric-looking values back to numbers so consumers
              // don't need to normalise. Preserves empty-string as "unset".
              const isNumeric = field.options.every((o) => /^-?\d+(\.\d+)?$/.test(o.value));
              update(v === '' ? '' : isNumeric ? Number(v) : v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'color':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <ColorInput
            value={typeof current === 'string' ? current : ''}
            onChange={update}
            presets={field.presets}
          />
        </div>
      );

    case 'image':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <ImageUpload
            value={typeof current === 'string' ? current : ''}
            onChange={(url) => update(url ?? '')}
            folder={field.folder ?? 'posts'}
          />
        </div>
      );

    case 'link':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <LinkPicker
            value={typeof current === 'string' ? current : ''}
            onChange={update}
          />
        </div>
      );

    case 'banner-position':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <BannerPositionPicker
            value={typeof current === 'string' ? current : ''}
            onChange={update}
            placeholder={field.placeholder}
          />
        </div>
      );

    case 'category-picker':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <CategoryPicker
            value={typeof current === 'string' ? current : ''}
            onChange={update}
          />
        </div>
      );

    case 'tag-picker':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <TagPicker
            value={typeof current === 'string' ? current : ''}
            onChange={update}
          />
        </div>
      );

    case 'product-picker':
      return (
        <div className="space-y-1.5">
          {labelEl}
          <ProductPicker
            value={field.multiple ? (Array.isArray(current) ? current : []) : (typeof current === 'string' ? current : '')}
            onChange={update}
            multiple={field.multiple}
          />
        </div>
      );

    case 'array':
      return (
        <ArrayFieldEditor
          field={field}
          value={Array.isArray(current) ? current : []}
          onChange={update}
        />
      );

    case 'group':
      return (
        <fieldset className="space-y-3 rounded-md border p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {field.label}
          </legend>
          {field.fields.map((child) => (
            <FieldRow
              key={child.key}
              field={child}
              value={value}
              onChange={onChange}
              parentKey={key}
            />
          ))}
        </fieldset>
      );

    default: {
      const _exhaust: never = field;
      void _exhaust;
      return null;
    }
  }
}

/**
 * ArrayFieldEditor — repeatable rows, each with its own itemFields rendered
 * via nested PropertyEditor. Collapsible per item, with drag reordering and
 * a per-item delete. Add/remove buttons obey `min`/`max`.
 */
function ArrayFieldEditor({
  field,
  value,
  onChange,
}: {
  field: Extract<Field, { type: 'array' }>;
  value: unknown[];
  onChange: (v: unknown[]) => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const canAdd = field.max === undefined || value.length < field.max;
  const canRemove = field.min === undefined || value.length > field.min;

  function addItem() {
    const item: Record<string, unknown> = {};
    for (const f of field.itemFields) {
      if (f.type === 'array') item[f.key] = f.defaultValue ?? [];
      else if (f.type === 'group') continue;
      else item[f.key] = f.defaultValue ?? (f.type === 'boolean' ? false : '');
    }
    const next = [...value, item];
    onChange(next);
    setOpenIdx(next.length - 1);
  }

  function updateAt(index: number, patch: Record<string, unknown>) {
    const next = value.slice();
    next[index] = patch;
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setOpenIdx(null);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = value.slice();
    const [item] = next.splice(index, 1);
    next.splice(index - 1, 0, item);
    onChange(next);
  }

  function moveDown(index: number) {
    if (index === value.length - 1) return;
    const next = value.slice();
    const [item] = next.splice(index, 1);
    next.splice(index + 1, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{field.label}</label>
        <span className="text-xs text-muted-foreground">
          {value.length} item{value.length === 1 ? '' : 's'}
        </span>
      </div>

      {value.length === 0 ? (
        <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
          No items yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {value.map((item, i) => {
            const itemObj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
            const summary = renderSummary(field.itemSummary, itemObj, i);
            const isOpen = openIdx === i;
            return (
              <li key={i} className={cn('rounded border bg-card', isOpen && 'ring-1 ring-primary/40')}>
                <div className="flex items-center gap-2 p-2">
                  {/*
                    Decorative drag-grip icon. The real reorder actions are the
                    ↑/↓ buttons a few nodes below — the grip is just a visual
                    affordance. Was previously a <button> which nested another
                    <button>, invalid HTML that broke hydration.
                  */}
                  <span className="text-muted-foreground" aria-hidden>
                    <GripVertical className="size-3.5" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="flex flex-1 items-center gap-2 rounded px-1 text-left text-sm hover:bg-accent/50"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{summary}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="rounded p-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(i)}
                    disabled={i === value.length - 1}
                    className="rounded p-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                    aria-label="Move down"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    disabled={!canRemove}
                    className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                    aria-label="Remove item"
                    title="Remove"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {isOpen ? (
                  <div className="space-y-4 border-t px-3 py-3">
                    {field.itemFields.map((sub) => (
                      <FieldRow
                        key={sub.key}
                        field={sub}
                        value={itemObj}
                        onChange={(next) => updateAt(i, next)}
                        parentKey={String(i)}
                      />
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        disabled={!canAdd}
      >
        <Plus className="size-3.5" />
        {field.addLabel ?? 'Add item'}
      </Button>
    </div>
  );
}

/**
 * Visibility guard: a field is shown if the sibling boolean it references
 * is truthy. Also supports synthetic keys for the ProductGrid `source` Select
 * (`source_is_category`, `source_is_tag`, `source_is_manual`).
 */
function isVisible(showIfKey: string, siblings: Record<string, unknown>): boolean {
  // Synthetic: `source_is_category` maps to siblings.source === 'category'.
  const syntheticMatch = /^([a-zA-Z_]+)_is_([a-zA-Z_]+)$/.exec(showIfKey);
  if (syntheticMatch) {
    const [, key, expected] = syntheticMatch;
    return siblings[key!] === expected;
  }
  return !!siblings[showIfKey];
}

/**
 * Fill "Slide {index}: {headline}" style patterns from item props.
 */
function renderSummary(pattern: string | undefined, item: Record<string, unknown>, index: number): string {
  if (!pattern) return `Item ${index + 1}`;
  return pattern.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === 'index') return String(index + 1);
    const v = item[key];
    if (typeof v === 'string') return v || `Item ${index + 1}`;
    if (typeof v === 'number') return String(v);
    return `Item ${index + 1}`;
  });
}
