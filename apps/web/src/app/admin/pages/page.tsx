'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, FileText, LayoutTemplate, Plus } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
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
import { revalidateStorefront } from '@/lib/revalidate';
import type { PageBlock } from '@/components/cms/page-canvas';
import { ExternalLink } from 'lucide-react';

const PageCanvas = dynamic(
  () => import('@/components/cms/page-canvas').then((m) => m.PageCanvas),
  {
    ssr: false,
    loading: () => <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Loading editor…</div>,
  },
);

type Page = {
  id: string;
  title: string;
  slug: string;
  layoutJson?: unknown;
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

/** Coerce whatever shape the API returned into a PageBlock[] the canvas expects. */
function extractBlocks(layoutJson: unknown): PageBlock[] {
  if (!layoutJson || typeof layoutJson !== 'object') return [];
  const raw = (layoutJson as { blocks?: unknown }).blocks;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b, i) => {
      if (!b || typeof b !== 'object') return null;
      const obj = b as Record<string, unknown>;
      const type = typeof obj.type === 'string' ? obj.type : null;
      if (!type) return null;
      const templateId = typeof obj.templateId === 'string' ? obj.templateId : undefined;
      const templateName = typeof obj.templateName === 'string' ? obj.templateName : undefined;
      return {
        id: typeof obj.id === 'string' && obj.id ? obj.id : `b_${i}`,
        type,
        props: (obj.props && typeof obj.props === 'object'
          ? (obj.props as Record<string, unknown>)
          : {}) as Record<string, unknown>,
        ...(templateId ? { templateId } : {}),
        ...(templateName ? { templateName } : {}),
      } satisfies PageBlock;
    })
    .filter((b): b is PageBlock => b !== null);
}

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
      const r = await apiFetch<ListResponse>('/pages?pageSize=200&includeLayout=false');
      setData(r.items);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function openEdit(row: Page) {
    try {
      const full = await apiFetch<Page>(`/pages/${row.id}`);
      setEditing(full);
    } catch (e) {
      toast({
        title: 'Load page failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
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
              <DropdownMenuItem onClick={() => void openEdit(row.original)}>Edit</DropdownMenuItem>
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

  const [blocks, setBlocks] = useState<PageBlock[]>([]);

  useEffect(() => {
    if (!open) return;
    setBlocks(extractBlocks(initial?.layoutJson));
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

  async function submit() {
    const isEditMode = !!initial;
    const values = isEditMode ? updateForm.getValues() : createForm.getValues();

    const ok = isEditMode
      ? await updateForm.trigger()
      : await createForm.trigger();
    if (!ok) return;

    const body: Record<string, unknown> = {
      title: values.title,
      status: values.status,
      layoutJson: { blocks },
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
      // Invalidate storefront caches so the change appears immediately.
      const slug = values.slug ?? initial?.slug;
      await revalidateStorefront(['pages', slug ? `page:${slug}` : ''].filter(Boolean));
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
                <label className="text-sm font-medium">Page blocks</label>
                <div className="flex items-center gap-3">
                  {initial ? (
                    <a
                      href={
                        initial.status === 'PUBLISHED'
                          ? `/${initial.slug}`
                          : `/${initial.slug}?preview=1`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      Open preview
                    </a>
                  ) : null}
                  <Link
                    href="/admin/block-templates"
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <LayoutTemplate className="size-3" />
                    Manage templates
                  </Link>
                </div>
              </div>
              <PageCanvas value={blocks} onChange={setBlocks} />
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
