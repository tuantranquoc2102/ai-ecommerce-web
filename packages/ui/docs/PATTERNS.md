# Patterns

Composite patterns for building full screens. Each pattern is a recipe assembled from primitives — **use these instead of re-inventing layout**.

---

## PageHeader

Every admin screen starts with `<PageHeader>`. It guarantees title typography, action placement, and spacing.

```tsx
import { Button, PageHeader } from '@ecom/ui';
import { Plus } from 'lucide-react';

<PageHeader
  title="Products"
  description="Manage your storefront catalog."
  actions={
    <Button>
      <Plus /> New product
    </Button>
  }
/>
```

Props: `title`, `description?`, `actions?`, `breadcrumbs?`.

---

## DataTable

Sortable, filterable, paginated table built on TanStack Table. **Use for every list view** — do not build tables by hand.

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge, Button, DataTable, EmptyState } from '@ecom/ui';
import { Plus, Package } from 'lucide-react';

type Product = { id: string; name: string; price: number; status: 'active' | 'draft' };

const columns: ColumnDef<Product>[] = [
  { accessorKey: 'name', header: 'Name' },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => `$${row.original.price.toFixed(2)}`,
  },
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

export function ProductsTable({ data, loading }: { data: Product[]; loading: boolean }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      searchColumn="name"
      searchPlaceholder="Search products…"
      empty={
        <EmptyState
          icon={<Package />}
          title="No products yet"
          action={<Button><Plus /> Create product</Button>}
        />
      }
    />
  );
}
```

Props: `columns`, `data`, `loading?`, `searchColumn?`, `toolbar?`, `empty?`, `pageSize?`, `onRowClick?`.

**Rules:**
- Column headers are strings (or short JSX). No sort logic in cells.
- Custom cell rendering goes in `cell: ({ row }) => …`.
- Row actions (edit/delete): last column, use `<DropdownMenu>`. See § Row actions below.

---

## EmptyState

Zero-data placeholder for lists, tables, search results.

```tsx
<EmptyState
  icon={<Box />}
  title="No products yet"
  description="Create your first product to see it listed here."
  action={<Button>Create product</Button>}
/>
```

Omit `action` when the emptiness is not resolvable (e.g., search with no matches).

---

## ConfirmDialog

For every irreversible or destructive action.

```tsx
import { Button, ConfirmDialog, useToast } from '@ecom/ui';

const { toast } = useToast();

<ConfirmDialog
  trigger={<Button variant="destructive">Delete</Button>}
  title="Delete this product?"
  description="This action cannot be undone."
  destructive
  confirmLabel="Delete"
  onConfirm={async () => {
    await deleteProduct(id);
    toast({ title: 'Product deleted', variant: 'success' });
  }}
/>
```

Loading state (`Working…`) is handled automatically while `onConfirm` runs.

---

## Form (list → create/edit → save)

Standard admin form with react-hook-form + zod. Composition is always: `Form → form → FormField → FormItem`.

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  useToast,
} from '@ecom/ui';

const schema = z.object({
  name: z.string().min(1, 'Required').max(120),
  description: z.string().max(2000).optional().default(''),
  price: z.coerce.number().nonnegative(),
});
type FormValues = z.infer<typeof schema>;

export function ProductForm({ onSaved }: { onSaved: () => void }) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', price: 0 },
  });

  async function onSubmit(values: FormValues) {
    try {
      await saveProduct(values);
      toast({ title: 'Saved', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({
        title: 'Save failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Blue widget" />
              </FormControl>
              <FormDescription>Shown to customers.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (USD)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

**Key rules:**
- Schema is `zod`; type inferred via `z.infer`.
- Every field is wrapped in `FormField → FormItem → FormLabel + FormControl + FormMessage`. This wires accessibility automatically.
- Never put a raw `<label>` inside a form.
- `zodResolver` connects zod validation to RHF.

---

## Full CRUD screen recipe

Assemble list + drawer form + confirm delete:

```
'use client';

<>
  <PageHeader
    title="Products"
    description="Manage your catalog."
    actions={
      <Sheet>
        <SheetTrigger asChild>
          <Button><Plus /> New product</Button>
        </SheetTrigger>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>New product</SheetTitle>
          </SheetHeader>
          <div className="mt-6"><ProductForm onSaved={close} /></div>
        </SheetContent>
      </Sheet>
    }
  />

  <DataTable
    columns={columns}
    data={data}
    loading={loading}
    searchColumn="name"
    onRowClick={(row) => setEditing(row)}
    empty={<EmptyState icon={<Box />} title="No products" />}
  />

  {editing && (
    <Sheet open onOpenChange={(o) => !o && setEditing(null)}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit product</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <ProductForm initial={editing} onSaved={() => setEditing(null)} />
        </div>
      </SheetContent>
    </Sheet>
  )}
</>
```

---

## Row actions

Use `<DropdownMenu>` in the last column of a `<DataTable>`:

```tsx
{
  id: 'actions',
  cell: ({ row }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => edit(row.original)}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <ConfirmDialog
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
              Delete
            </DropdownMenuItem>
          }
          title="Delete this row?"
          destructive
          onConfirm={() => del(row.original.id)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
```

Note the `stopPropagation` on the trigger — otherwise the row's `onClick` fires.

---

## Loading states

For an entire screen shell that's still fetching:

```tsx
if (!data) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

For a table specifically, `DataTable` handles its own skeleton via the `loading` prop — don't wrap it in a `<Skeleton>`.

---

## Error handling

- **Transient failures** (save failed, network flake) → `toast({ variant: 'destructive' })`.
- **Blocking errors** (unauthorized, page-level failure) → `<Alert variant="destructive">` at the top of the content area.
- **Field validation** → automatic via `<FormMessage>`. Do not print zod errors manually.
