'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, Plus, Tag as TagIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import { CreateTagDto, type CreateTagDto as CreateTagValues } from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

type Tag = {
  id: string;
  name: string;
  slug: string;
  _count: { productTags: number };
};

type ListResponse = { items: Tag[]; total: number; page: number; pageSize: number };

export default function TagsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch<ListResponse>('/tags?pageSize=200');
      setData(res.items);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    try {
      await apiFetch<null>(`/tags/${id}`, { method: 'DELETE' });
      toast({ title: 'Tag deleted', variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<Tag>[] = [
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.original.slug}</code>
      ),
    },
    {
      id: 'usage',
      header: 'Products',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original._count.productTags}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(row.original)}>Edit</DropdownMenuItem>
              <ConfirmDialog
                trigger={
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                }
                title={`Delete tag "${row.original.name}"?`}
                description="This cannot be undone."
                destructive
                confirmLabel="Delete"
                onConfirm={() => handleDelete(row.original.id)}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tags"
        description="Free-form labels attached to products for filtering and search."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New tag
          </Button>
        }
      />

      {err ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchColumn="name"
        searchPlaceholder="Search tags…"
        empty={
          <EmptyState
            icon={<TagIcon />}
            title="No tags yet"
            description="Tags help customers find related products."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Create tag
              </Button>
            }
          />
        }
      />

      <TagFormSheet
        open={creating}
        onOpenChange={(o) => setCreating(o)}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <TagFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function TagFormSheet({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Tag | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<CreateTagValues>({
    resolver: zodResolver(CreateTagDto),
    defaultValues: { name: '', slug: '' },
  });

  useEffect(() => {
    if (open) form.reset(initial ? { name: initial.name, slug: initial.slug } : { name: '', slug: '' });
  }, [open, initial, form]);

  async function onSubmit(values: CreateTagValues) {
    const body = { name: values.name, ...(values.slug ? { slug: values.slug } : {}) };
    try {
      if (initial) {
        await apiFetch<Tag>(`/tags/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Tag updated', variant: 'success' });
      } else {
        await apiFetch<Tag>('/tags', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Tag created', variant: 'success' });
      }
      onSaved();
    } catch (e) {
      toast({
        title: initial ? 'Update failed' : 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{initial ? 'Edit tag' : 'New tag'}</SheetTitle>
          <SheetDescription>
            {initial ? 'Rename this tag or change its slug.' : 'Slug auto-generates from name if left blank.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Featured" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="auto-generated" />
                  </FormControl>
                  <FormDescription>Lowercase kebab-case. Leave empty to auto-generate.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : initial ? 'Save' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
