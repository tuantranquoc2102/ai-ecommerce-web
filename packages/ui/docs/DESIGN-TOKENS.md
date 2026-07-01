# Design Tokens

All tokens live in `packages/ui/src/styles/globals.css`. They are declared inside a `@theme { ... }` block (Tailwind v4 syntax), which emits both CSS variables AND matching Tailwind utility classes.

**Rule:** components should reference **semantic tokens** (like `bg-primary`) — not raw brand ramps (like `bg-brand-500`). Re-branding = editing one file.

---

## Semantic tokens (the ones you use daily)

These map to CSS variables that flip between light/dark theme.

| Token | Tailwind class | Purpose |
|---|---|---|
| `--background` | `bg-background` | Page background |
| `--foreground` | `text-foreground` | Default text color |
| `--card` | `bg-card` | Surface for cards, panels |
| `--card-foreground` | `text-card-foreground` | Text on cards |
| `--popover` | `bg-popover` | Dropdowns, tooltips, popovers |
| `--popover-foreground` | `text-popover-foreground` | Text in popovers |
| `--primary` | `bg-primary`, `text-primary` | Primary CTA color |
| `--primary-foreground` | `text-primary-foreground` | Text on primary bg |
| `--secondary` | `bg-secondary` | Secondary surfaces (buttons, badges) |
| `--secondary-foreground` | `text-secondary-foreground` | Text on secondary bg |
| `--muted` | `bg-muted`, `text-muted-foreground` | De-emphasized surfaces & text |
| `--accent` | `bg-accent`, `text-accent-foreground` | Hover / selection highlights |
| `--destructive` | `bg-destructive`, `text-destructive` | Error, delete actions |
| `--destructive-foreground` | `text-destructive-foreground` | Text on destructive bg |
| `--success` | `bg-success`, `text-success` | Positive states |
| `--warning` | `bg-warning`, `text-warning-foreground` | Cautions, low-priority alerts |
| `--border` | `border-border` | Borders, dividers |
| `--input` | `border-input` | Form control borders |
| `--ring` | `ring-ring` | Focus rings |

### Example

```tsx
// ✅ correct — semantic
<div className="rounded-lg border bg-card text-card-foreground shadow-sm">…</div>

// ❌ wrong — raw colors, breaks theming
<div className="rounded-lg border-gray-200 bg-white text-gray-900 shadow-sm">…</div>
```

---

## Brand ramp (for tokens only, not components)

The brand ramp defines the primary hue. **Do not use these directly in components** — semantic tokens above already reference the correct rung of this ramp. Edit the ramp to re-brand.

| Class | Notes |
|---|---|
| `bg-brand-50` … `bg-brand-950` | 11-step OKLCH scale, hue 264 (blue-purple) |

Change the hue in `globals.css`:

```css
@theme {
  --color-brand-500: oklch(0.62 0.18 300); /* switch to magenta */
  /* ...update the whole ramp */
}
```

---

## Radius

| Token | Class | Value |
|---|---|---|
| `--radius-xs` | `rounded-xs` | 0.125rem (2px) |
| `--radius-sm` | `rounded-sm` | 0.25rem (4px) |
| `--radius-md` | `rounded-md` | 0.375rem (6px) — default for controls |
| `--radius-lg` | `rounded-lg` | 0.5rem (8px) — default for cards |
| `--radius-xl` | `rounded-xl` | 0.75rem |
| `--radius-2xl` | `rounded-2xl` | 1rem |

---

## Typography

Fonts are declared as CSS variables:

- `--font-sans` — UI text (default)
- `--font-mono` — code, IDs

The base layer sets `body { font-family: var(--font-sans); }`. Use `font-mono` only for code and non-natural-language content (IDs, SKUs, hashes).

Size scale is Tailwind's default (`text-xs`, `text-sm`, `text-base`, ...). Common combinations:

| Use case | Recommendation |
|---|---|
| Page title (h1) | `text-2xl font-semibold tracking-tight` |
| Section title (h2) | `text-lg font-semibold` |
| Card title | `text-base font-semibold` |
| Body text | `text-sm` |
| Helper / muted | `text-xs text-muted-foreground` |
| Code | `text-xs font-mono bg-muted rounded px-1.5 py-0.5` |

---

## Layout

| Token | Class | Value |
|---|---|---|
| `--container-2xl` | `max-w-container-2xl` | 1400px, page max width |
| `--spacing-sidebar` | `w-sidebar` | 16rem (256px), desktop sidebar |
| `--spacing-sidebar-collapsed` | `w-sidebar-collapsed` | 4rem, collapsed sidebar |
| `--spacing-topbar` | `h-topbar` | 3.5rem, sticky topbar |

---

## Motion

| Token | Notes |
|---|---|
| `--animate-fade-in` / `--animate-fade-out` | Overlay / toast fades |
| `--animate-slide-in-right` | Sheet from-right |

Radix animations also work out-of-the-box because `tailwindcss-animate` is installed in the consumer. Use `data-[state=open]:animate-in data-[state=closed]:animate-out` on Radix primitives — see the existing component code for examples.

---

## Dark mode

Applied by adding `class="dark"` to `<html>` (or `<body>`). The `.dark` selector in `globals.css` overrides the semantic CSS variables. No JS is required if you use system-preference detection via `prefers-color-scheme` — extend `globals.css` with:

```css
@media (prefers-color-scheme: dark) {
  :root { /* copy .dark overrides here */ }
}
```

Alternatively, install `next-themes` (or your framework's equivalent) and toggle the class from JS.
