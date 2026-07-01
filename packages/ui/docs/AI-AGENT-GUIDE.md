# AI Agent Guide — Rules for Coding New Screens

**Read this file before writing any frontend code.** It is the authoritative rule set. Following it produces screens that are consistent, accessible, themable, and don't require design review. Deviating from it produces churn and rework.

If a rule blocks a real need, propose extending the design system — do NOT bypass the rule in a page.

---

## 1. Import discipline

- **All UI comes from `@ecom/ui`.** Never import from `@radix-ui/*` directly in an app — use our owned wrappers. Icons from `lucide-react` are OK.
- **Never write inline styles** (`style={{ … }}`) except for genuinely dynamic values that can't be Tailwind classes (e.g., a live-computed `transform` for drag-and-drop).
- **Never hardcode colors** (no `#3b82f6`, no `bg-blue-500`). Use semantic tokens — see [DESIGN-TOKENS.md](./DESIGN-TOKENS.md).

**Wrong ❌**
```tsx
import * as Dialog from '@radix-ui/react-dialog';
<div style={{ padding: 16, background: '#f8fafc' }}>…</div>
<div className="bg-blue-500 text-white">…</div>
```

**Right ✅**
```tsx
import { Dialog, DialogContent } from '@ecom/ui';
<div className="p-4 bg-muted">…</div>
<div className="bg-primary text-primary-foreground">…</div>
```

---

## 2. className composition

**Always** use `cn(...)` from `@ecom/ui`. It combines `clsx` and `tailwind-merge` so conflicting utilities de-dupe (e.g., `px-2` overrides an earlier `px-4`).

**Wrong ❌**
```tsx
<div className={`rounded p-4 ${isActive ? 'bg-primary' : ''}`} />
<div className={"btn " + variantClass} />
```

**Right ✅**
```tsx
<div className={cn('rounded p-4', isActive && 'bg-primary', className)} />
```

---

## 3. Page structure

Every admin page follows this skeleton:

```tsx
export default function SomePage() {
  return (
    <>
      <PageHeader title="…" description="…" actions={…} />
      {/* main content */}
    </>
  );
}
```

- **`<PageHeader>` is required** for every admin route. It owns page-level typography and top spacing.
- **No `<h1>` outside `<PageHeader>`.** Section headings inside content are `<h2 className="text-lg font-semibold">`.
- **No `<main>`** at the page level — the admin shell layout owns it.

---

## 4. Data lists → always `<DataTable>`

If you find yourself writing a `<table>` element, stop. Use `<DataTable>` from patterns. It handles:

- Sorting (click header)
- Filtering (single search box)
- Pagination
- Loading skeletons
- Empty state

**Wrong ❌**
```tsx
<table>
  <thead>…</thead>
  <tbody>{rows.map(…)}</tbody>
</table>
```

**Right ✅**
```tsx
<DataTable columns={columns} data={rows} loading={loading} searchColumn="name" />
```

The `columns` definition is a `ColumnDef<T>[]` — see [PATTERNS.md § DataTable](./PATTERNS.md#datatable).

---

## 5. Forms → always `<Form> + <FormField> + <FormItem>` with zod + RHF

Every form MUST use `react-hook-form` + `zod`. Every field MUST be wrapped in `FormField → FormItem → FormLabel + FormControl + FormMessage`.

**Wrong ❌**
```tsx
<form onSubmit={…}>
  <label htmlFor="email">Email</label>
  <input id="email" value={email} onChange={…} />
  {error && <span className="text-red-500">{error}</span>}
</form>
```

**Right ✅**
```tsx
const form = useForm({ resolver: zodResolver(schema), defaultValues: … });

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl><Input type="email" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

**Why:** `FormControl` auto-wires `aria-describedby` and `aria-invalid`, and `FormMessage` renders the zod error automatically. Skipping this pattern means broken screen-reader UX.

---

## 6. Overlays — pick the right one

| Situation | Component | Notes |
|---|---|---|
| Confirmation ("delete this?") | `<ConfirmDialog>` pattern | Handles loading state; use for irreversible actions |
| Multi-field form modal | `<Dialog>` | Small-to-medium forms |
| Complex form / side panel | `<Sheet>` from right | Long forms, wizards, mobile-first |
| Contextual menu / row actions | `<DropdownMenu>` | With ellipsis button |
| Field help / icon explanations | `<Tooltip>` | Hover only; not for critical info |

**Do NOT** stack modals. Do NOT nest `<Sheet>` inside `<Dialog>`.

---

## 7. Feedback (toasts, alerts, empty states)

| Situation | Component | Example |
|---|---|---|
| Transient success/error notification | `useToast()` | `toast({ title: 'Saved', variant: 'success' })` |
| Blocking page-level error (auth, load failure) | `<Alert variant="destructive">` | Renders inside the page |
| Field validation error | `<FormMessage>` | Auto — never render zod issues manually |
| Zero data / no results | `<EmptyState>` | With icon + optional action |
| Skeleton loading | `<Skeleton>` | Match dimensions of real content |

**Wrong ❌**
```tsx
{loading && <div>Loading…</div>}
{error && <div style={{ color: 'red' }}>{error}</div>}
{data.length === 0 && <div>No results</div>}
```

**Right ✅**
```tsx
{loading && <Skeleton className="h-64 w-full" />}
{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
{!loading && data.length === 0 && <EmptyState icon={<Box />} title="No results" />}
```

---

## 8. Buttons

- **One `variant="default"` per view.** Everything else is `outline`, `secondary`, `ghost`, or `destructive`.
- **Icons in buttons:** just drop the icon as a child of `<Button>`. Sizing/spacing is handled automatically (`[&_svg]:size-4`).
  ```tsx
  <Button><Plus /> New product</Button>
  ```
- **Icon-only buttons:** use `size="icon"` and always add `aria-label`.
  ```tsx
  <Button size="icon" variant="ghost" aria-label="Open menu"><Menu /></Button>
  ```
- **Wrapping Next `<Link>`:** use `asChild`.
  ```tsx
  <Button asChild><Link href="/admin/products/new">New</Link></Button>
  ```
- **Loading buttons:** disable + show spinner.
  ```tsx
  <Button disabled={saving}>
    {saving ? <Loader2 className="animate-spin" /> : null}
    Save
  </Button>
  ```

---

## 9. Routing (Next App Router)

- `typedRoutes: true` is on. All `<Link href="…">` targets must resolve to a real file-system route.
- If you're referring to a route from a config array (like a nav item), type it as `Route` from `next`:
  ```ts
  import type { Route } from 'next';
  const NAV: { href: Route; … }[] = [{ href: '/admin/products', … }];
  ```
- Admin routes live under `apps/web/src/app/admin/*`. Every admin page inherits the `AdminShell` (sidebar + topbar) from `admin/layout.tsx`. Don't wrap admin pages in another shell.

---

## 10. Accessibility (non-negotiable)

- **Never remove `aria-*` attrs** from Radix primitives (i.e., don't spread `{...props}` onto the wrong node).
- **Every icon-only interactive element gets an `aria-label`** (buttons, links, menu triggers).
- **Form fields:** use `<FormLabel>` (auto-links via `htmlFor`). Never a plain `<label>` inside a form.
- **Focus states:** don't remove them. If you add a custom `focus-visible:` style, make sure the outline offset stays readable (>= 2px).
- **Color-only signals:** never encode meaning in color alone. Pair with an icon or label. Example: don't use "green row" to mean "active" — also add a `<Badge>Active</Badge>`.

---

## 11. Layout & spacing

- Use Tailwind spacing scale — no custom pixel values. `p-4 gap-6 space-y-3`, not `p-[17px]`.
- Card content padding: `p-6` (default from `<CardHeader>` / `<CardContent>`).
- Vertical rhythm inside a page section: `space-y-6` between major blocks, `space-y-3` inside a block.
- Page horizontal padding is owned by the admin shell (`px-4 sm:px-6 lg:px-8`). Page-level content should NOT add its own outer horizontal padding.

---

## 12. Client vs server components

- Add `'use client'` **only when needed** — event handlers, `useState`, `useEffect`, `useForm`, or importing a client-only lib.
- Static content pages should stay server components (default). Import primitives from `@ecom/ui` — they mark themselves `'use client'` internally where required.
- Never mark an entire page `'use client'` just because one small piece needs interactivity. Instead, extract that piece into its own client component.

---

## 13. Common mistakes to avoid

| Mistake | Fix |
|---|---|
| `import { Button } from '@radix-ui/react-…'` | Import from `@ecom/ui` |
| `style={{ padding: 24 }}` | `className="p-6"` |
| `className={'btn ' + (isActive ? 'active' : '')}` | `className={cn('btn', isActive && 'active')}` |
| `bg-blue-500` | `bg-primary` |
| Raw `<table>` in a list | `<DataTable>` |
| `<div>Loading…</div>` | `<Skeleton />` |
| Manual `<label htmlFor="…">` in a form | `<FormLabel>` inside `<FormItem>` |
| `alert('Deleted')` after action | `toast({ title: 'Deleted', variant: 'success' })` |
| Missing `aria-label` on icon-only button | Add `aria-label="…"` |
| Global `<h1>` inside content | `<PageHeader title="…">` |
| `catch (e) { console.log(e) }` and silent failure | `toast({ variant: 'destructive', ... })` on the UI too |

---

## 14. Standard screen recipe (copy this)

```tsx
// apps/web/src/app/admin/<resource>/page.tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@ecom/ui';

type Row = { id: string; name: string; status: 'active' | 'draft' };

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>
        {row.original.status}
      </Badge>
    ),
  },
];

export default function ResourcePage() {
  const [data] = useState<Row[]>([]); // fetch from your API
  const loading = false;

  return (
    <>
      <PageHeader
        title="Resource"
        description="Short description of what lives here."
        actions={
          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <Plus /> New
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>New resource</SheetTitle>
              </SheetHeader>
              {/* <ResourceForm onSaved={…} /> */}
            </SheetContent>
          </Sheet>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchColumn="name"
        searchPlaceholder="Search…"
        empty={
          <EmptyState
            title="Nothing yet"
            description="Create your first entry."
            action={<Button><Plus /> Create</Button>}
          />
        }
      />
    </>
  );
}
```

Follow this shape unless you have a documented reason not to. If your page doesn't fit — talk to the design system first, don't fork.

---

## 15. When in doubt

1. Search this repo for a similar existing screen.
2. Read the relevant section in [PATTERNS.md](./PATTERNS.md).
3. If the pattern doesn't exist, propose adding it. Do not create one-off patterns in a page file.
