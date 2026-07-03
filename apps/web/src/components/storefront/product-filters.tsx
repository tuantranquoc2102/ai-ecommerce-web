'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  cn,
} from '@ecom/ui';
import { formatVnd } from '@/lib/storefront/format';

const SORT_OPTIONS: Array<{ value: string; label: string; sortBy: string; sortDir: 'asc' | 'desc' }> = [
  { value: 'newest', label: 'Newest', sortBy: 'createdAt', sortDir: 'desc' },
  { value: 'oldest', label: 'Oldest', sortBy: 'createdAt', sortDir: 'asc' },
  { value: 'price-asc', label: 'Price: low to high', sortBy: 'basePrice', sortDir: 'asc' },
  { value: 'price-desc', label: 'Price: high to low', sortBy: 'basePrice', sortDir: 'desc' },
  { value: 'title-asc', label: 'Name: A → Z', sortBy: 'title', sortDir: 'asc' },
  { value: 'title-desc', label: 'Name: Z → A', sortBy: 'title', sortDir: 'desc' },
];

/**
 * Reads the current sortBy/sortDir from the URL and maps them to one of the
 * option `value`s above. Falls back to "newest" when the URL has neither.
 */
function pickSortValue(sortBy: string | null, sortDir: string | null): string {
  const match = SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortDir === sortDir);
  return match?.value ?? 'newest';
}

/**
 * Builds a URL that preserves the current filter set, overriding only the
 * keys listed in `patch`. Passing `null` or `''` in the patch clears the
 * param. Resets `page` to page 1 whenever any filter changes (except when
 * the patch itself sets `page`), so users don't land on page 5 of a smaller
 * filtered result set.
 *
 * `pathname` is passed in so filter changes stay on the current route
 * (`/products` for the all-products view, `/products/c/<slug>` for a
 * category-specific view). To leave a category, callers can pass a
 * different pathname explicitly.
 */
function buildFilterUrl(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | null | undefined>,
): string {
  const qs = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === '' || v === undefined) qs.delete(k);
    else qs.set(k, v);
  }
  if (!Object.prototype.hasOwnProperty.call(patch, 'page')) qs.delete('page');
  const s = qs.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/**
 * Top-bar controls for search + sort. Search debounces navigation by 450ms of
 * quiet keys (or on Enter). Sort commits immediately.
 */
export function ProductSearchAndSort() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const initialQuery = search.get('q') ?? '';
  const [q, setQ] = useState(initialQuery);
  const sortValue = pickSortValue(search.get('sortBy'), search.get('sortDir'));

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // Keep local input in sync when the URL changes externally (browser nav,
  // clearing filters), but ignore updates that arrive while the user is
  // actively typing.
  useEffect(() => {
    if (!dirtyRef.current) setQ(initialQuery);
  }, [initialQuery]);

  function commitSearch(next: string) {
    dirtyRef.current = false;
    router.push(buildFilterUrl(pathname, search, { q: next.trim() || null }));
  }

  function handleQueryChange(next: string) {
    setQ(next);
    dirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commitSearch(next), 450);
  }

  function handleSort(value: string) {
    const opt = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0]!;
    router.push(buildFilterUrl(pathname, search, { sortBy: opt.sortBy, sortDir: opt.sortDir }));
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (debounceRef.current) clearTimeout(debounceRef.current);
              commitSearch(q);
            }
          }}
          placeholder="Search products…"
          className="pl-9"
          aria-label="Search products"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ('');
              commitSearch('');
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sort by</span>
        <Select value={sortValue} onValueChange={handleSort}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Preset price ranges shown as pill buttons. `null` bounds mean unbounded.
 * The final "any" preset clears both min and max.
 */
const PRICE_PRESETS: Array<{ label: string; min: number | null; max: number | null }> = [
  { label: 'Any', min: null, max: null },
  { label: 'Under 100k', min: null, max: 100_000 },
  { label: '100k – 300k', min: 100_000, max: 300_000 },
  { label: '300k – 700k', min: 300_000, max: 700_000 },
  { label: '700k – 1.5M', min: 700_000, max: 1_500_000 },
  { label: 'Over 1.5M', min: 1_500_000, max: null },
];

/**
 * Sidebar block: price range + tag filters. Both write to the URL via one
 * "Apply" button so the shopper can dial in several changes before we refetch.
 */
export function ProductPriceTagFilters({
  tags,
}: {
  tags: Array<{ id: string; name: string; productCount: number }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [min, setMin] = useState<string>(search.get('minPrice') ?? '');
  const [max, setMax] = useState<string>(search.get('maxPrice') ?? '');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => {
    const raw = search.get('tagIds') ?? search.get('tagId');
    return new Set(raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []);
  });

  // Reset local state whenever the URL params change from outside (e.g. a
  // Clear-all click or category-tree navigation).
  useEffect(() => {
    setMin(search.get('minPrice') ?? '');
    setMax(search.get('maxPrice') ?? '');
    const raw = search.get('tagIds') ?? search.get('tagId');
    setSelectedTags(new Set(raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []));
  }, [search]);

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    router.push(
      buildFilterUrl(pathname, search, {
        minPrice: min && Number(min) > 0 ? String(Math.trunc(Number(min))) : null,
        maxPrice: max && Number(max) > 0 ? String(Math.trunc(Number(max))) : null,
        tagIds: selectedTags.size > 0 ? Array.from(selectedTags).join(',') : null,
        // `tagId` is legacy — drop it whenever we write `tagIds`.
        tagId: null,
      }),
    );
  }

  function applyPreset(preset: (typeof PRICE_PRESETS)[number]) {
    router.push(
      buildFilterUrl(pathname, search, {
        minPrice: preset.min !== null ? String(preset.min) : null,
        maxPrice: preset.max !== null ? String(preset.max) : null,
      }),
    );
  }

  const activeMin = search.get('minPrice');
  const activeMax = search.get('maxPrice');

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="mb-2 font-semibold">Price</h2>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((preset) => {
            const isActive =
              (preset.min === null ? !activeMin : Number(activeMin) === preset.min) &&
              (preset.max === null ? !activeMax : Number(activeMax) === preset.max);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:border-foreground hover:text-foreground',
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            aria-label="Minimum price"
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            aria-label="Maximum price"
          />
        </div>
        {activeMin || activeMax ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Current: {activeMin ? formatVnd(Number(activeMin)) : '—'} to{' '}
            {activeMax ? formatVnd(Number(activeMax)) : '—'}
          </p>
        ) : null}
      </div>

      {tags.length > 0 ? (
        <>
          <Separator />
          <div>
            <h2 className="mb-2 font-semibold">Tags</h2>
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {tags.map((tag) => {
                const checked = selectedTags.has(tag.id);
                return (
                  <li key={tag.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTag(tag.id)}
                        className="size-3.5 rounded border-muted-foreground"
                      />
                      <span className="flex-1 text-sm">{tag.name}</span>
                      {tag.productCount > 0 ? (
                        <span className="text-xs text-muted-foreground">({tag.productCount})</span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}

      <Button type="button" size="sm" className="w-full" onClick={apply}>
        Apply filters
      </Button>
    </div>
  );
}

/**
 * Small "clear all filters" link — surfaced above the grid when any filter is
 * active so shoppers who've narrowed too far can reset in one click.
 */
export function ActiveFiltersBar({
  categoryName,
}: {
  categoryName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const chips: Array<{ label: string; clear: () => void }> = [];
  const q = search.get('q');
  if (q) chips.push({ label: `Search: “${q}”`, clear: () => router.push(buildFilterUrl(pathname, search, { q: null })) });
  if (categoryName) {
    // Category lives in the path (`/products/c/<slug>`), so clearing it means
    // navigating back to `/products` while preserving the other filters.
    chips.push({
      label: `Category: ${categoryName}`,
      clear: () => router.push(buildFilterUrl('/products', search, {})),
    });
  }
  const min = search.get('minPrice');
  const max = search.get('maxPrice');
  if (min || max) {
    chips.push({
      label: `${min ? formatVnd(Number(min)) : '—'} – ${max ? formatVnd(Number(max)) : '—'}`,
      clear: () => router.push(buildFilterUrl(pathname, search, { minPrice: null, maxPrice: null })),
    });
  }
  const tagIds = search.get('tagIds') ?? search.get('tagId');
  if (tagIds) {
    const n = tagIds.split(',').filter(Boolean).length;
    chips.push({
      label: `${n} tag${n === 1 ? '' : 's'}`,
      clear: () => router.push(buildFilterUrl(pathname, search, { tagIds: null, tagId: null })),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip, i) => (
        <button
          key={i}
          type="button"
          onClick={chip.clear}
          className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-1 text-xs hover:bg-muted"
        >
          {chip.label}
          <X className="size-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => router.push('/products')}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
