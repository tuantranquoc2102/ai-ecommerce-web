'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, FileText, LayoutTemplate, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CreatePageDto,
  UpdatePageDto,
  type CreatePageDto as CreatePageValues,
  type PageStatus,
  type UpdatePageDto as UpdatePageValues,
} from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Badge,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

type Page = {
  id: string;
  title: string;
  slug: string;
  layoutJson: unknown;
  seoTitle: string | null;
  seoDesc: string | null;
  status: PageStatus;
  publishedAt: string | null;
  updatedAt: string;
};

type ListResponse = { items: Page[]; total: number; page: number; pageSize: number };

const STATUS_VARIANT: Record<PageStatus, 'secondary' | 'success' | 'warning'> = {
  DRAFT: 'secondary',
  PUBLISHED: 'success',
  SCHEDULED: 'warning',
};

const LAYOUT_JSON_HINT = `{
  "blocks": [
    { "id": "hero-1", "type": "HeroBanner", "props": { "bannerPosition": "home_hero" } },
    { "id": "featured", "type": "ProductGrid", "props": { "categoryId": "…", "limit": 8 } }
  ]
}`;

export default function PagesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch<ListResponse>('/pages?pageSize=200');
      setData(r.items);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(p: Page) {
    try {
      await apiFetch<null>(`/pages/${p.id}`, { method: 'DELETE' });
      toast({ title: `"${p.title}" deleted`, variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<Page>[] = [
    {
      accessorKey: 'title',
      header: 'Page',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.title}</div>
          <code className="text-xs text-muted-foreground">/{row.original.slug}</code>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>
      ),
    },
    {
      accessorKey: 'publishedAt',
      header: 'Published',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.publishedAt
            ? new Date(row.original.publishedAt).toLocaleDateString()
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.updatedAt).toLocaleDateString()}
        </span>
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
                title={`Delete page "${row.original.title}"?`}
                description="This cannot be undone."
                destructive
                confirmLabel="Delete"
                onConfirm={() => handleDelete(row.original)}
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
        title="Pages"
        description="Static and landing pages. Layout is stored as JSON blocks and rendered dynamically by the storefront widget parser."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/pages/templates">
                <LayoutTemplate className="size-4" /> Templates
              </Link>
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New page
            </Button>
          </>
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
        searchColumn="title"
        searchPlaceholder="Search by title…"
        empty={
          <EmptyState
            icon={<FileText />}
            title="No pages yet"
            description="Create your first page — Home, About, Terms — with drag-and-drop blocks."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Create page
              </Button>
            }
          />
        }
      />

      <PageFormSheet
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <PageFormSheet
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

function PageFormSheet({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Page | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const createForm = useForm<CreatePageValues>({
    resolver: zodResolver(CreatePageDto),
    defaultValues: {
      title: '',
      slug: '',
      layoutJson: { blocks: [] },
      seoTitle: '',
      seoDesc: '',
      status: 'DRAFT',
    },
  });
  const updateForm = useForm<UpdatePageValues>({
    resolver: zodResolver(UpdatePageDto),
    defaultValues: {
      title: '',
      slug: '',
      layoutJson: { blocks: [] },
      seoTitle: '',
      seoDesc: '',
      status: 'DRAFT',
    },
  });

  const [layoutText, setLayoutText] = useState('{"blocks":[]}');
  const [layoutErr, setLayoutErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const layoutInitial = initial?.layoutJson ?? { blocks: [] };
    const layoutStr = JSON.stringify(layoutInitial, null, 2);
    setLayoutText(layoutStr);
    setLayoutErr(null);
    if (initial) {
      updateForm.reset({
        title: initial.title,
        slug: initial.slug,
        // API stores this as opaque JSON; the form treats it as-is.
        layoutJson: initial.layoutJson as never,
        seoTitle: initial.seoTitle ?? '',
        seoDesc: initial.seoDesc ?? '',
        status: initial.status,
      });
    } else {
      createForm.reset({
        title: '',
        slug: '',
        layoutJson: { blocks: [] },
        seoTitle: '',
        seoDesc: '',
        status: 'DRAFT',
      });
    }
  }, [open, initial, createForm, updateForm]);

  function parseLayout(): unknown | null {
    try {
      const parsed = JSON.parse(layoutText || 'null');
      setLayoutErr(null);
      return parsed;
    } catch (e) {
      setLayoutErr((e as Error).message);
      return null;
    }
  }

  async function submit() {
    const layout = parseLayout();
    if (layoutErr) return;

    const isEditMode = !!initial;
    const values = isEditMode ? updateForm.getValues() : createForm.getValues();

    // Trigger validation once through the appropriate form.
    const ok = isEditMode
      ? await updateForm.trigger()
      : await createForm.trigger();
    if (!ok) return;

    const body: Record<string, unknown> = {
      title: values.title,
      status: values.status,
      layoutJson: layout,
    };
    if (values.slug) body.slug = values.slug;
    if (values.seoTitle !== undefined) body.seoTitle = values.seoTitle;
    if (values.seoDesc !== undefined) body.seoDesc = values.seoDesc;

    try {
      if (isEditMode && initial) {
        await apiFetch(`/pages/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Page updated', variant: 'success' });
      } else {
        await apiFetch('/pages', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Page created', variant: 'success' });
      }
      onSaved();
    } catch (e) {
      toast({
        title: isEditMode ? 'Update failed' : 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const active = isEdit ? updateForm : createForm;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit page' : 'New page'}</SheetTitle>
          <SheetDescription>
            Layout is opaque JSON — the storefront parser interprets each block. Full drag-drop
            builder is planned for M2.2.
          </SheetDescription>
        </SheetHeader>

        <Form {...(active as typeof createForm)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="mt-6 space-y-4"
          >
            <FormField
              control={active.control as typeof createForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={active.control as typeof createForm.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="auto-generated" />
                  </FormControl>
                  <FormDescription>URL path. Leave empty to auto-generate.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={active.control as typeof createForm.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select value={field.value ?? 'DRAFT'} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Layout JSON</label>
                <Link
                  href="/admin/pages/templates"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <LayoutTemplate className="size-3" />
                  Browse templates
                </Link>
              </div>
              <Textarea
                rows={10}
                spellCheck={false}
                value={layoutText}
                onChange={(e) => {
                  setLayoutText(e.target.value);
                  setLayoutErr(null);
                }}
                onBlur={parseLayout}
                className="font-mono text-xs"
              />
              {layoutErr ? (
                <p className="text-xs font-medium text-destructive">
                  Invalid JSON: {layoutErr}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Example: <code className="rounded bg-muted px-1">{LAYOUT_JSON_HINT.split('\n')[1]?.trim()}</code>
                </p>
              )}
            </div>

            <FormField
              control={active.control as typeof createForm.control}
              name="seoTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO title</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Overrides the page title in &lt;title&gt; when set.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={active.control as typeof createForm.control}
              name="seoDesc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={active.formState.isSubmitting}>
                {active.formState.isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
