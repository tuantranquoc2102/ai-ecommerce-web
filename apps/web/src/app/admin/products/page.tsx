'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Ellipsis, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CreateProductDto,
  type CategoryTreeNode,
  type CreateProductDto as CreateProductValues,
  type ProductStatus,
  type ProductType,
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
import { ProductGallery } from '@/components/product-gallery';

type Product = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  mainImage: string | null;
  galleryImages: string[] | null;
  type: ProductType;
  digitalType: 'FILE_DOWNLOAD' | 'SERIAL_KEY' | null;
  basePrice: string;
  salePrice: string | null;
  stockQuantity: number;
  status: ProductStatus;
  productCategories: { category: { id: string; name: string } }[];
  productTags: { tag: { id: string; name: string } }[];
};

type Tag = { id: string; name: string; slug: string };
type ListProducts = { items: Product[]; total: number; page: number; pageSize: number };

const STATUS_VARIANT: Record<ProductStatus, 'secondary' | 'success' | 'outline'> = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  ARCHIVED: 'outline',
};

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [prod, cats, tgs] = await Promise.all([
        apiFetch<ListProducts>('/products?pageSize=100'),
        apiFetch<CategoryTreeNode[]>('/categories/tree'),
        apiFetch<{ items: Tag[] }>('/tags?pageSize=200'),
      ]);
      setProducts(prod.items);
      setCategories(cats);
      setTags(tgs.items);
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
      await apiFetch<null>(`/products/${id}`, { method: 'DELETE' });
      toast({ title: 'Product archived', variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: 'title',
      header: 'Product',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.mainImage ? (
            <img
              src={row.original.mainImage}
              alt=""
              className="size-10 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="size-10 shrink-0 rounded bg-muted" />
          )}
          <div>
            <div className="font-medium">{row.original.title}</div>
            <code className="text-xs text-muted-foreground">{row.original.slug}</code>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type === 'DIGITAL' ? `Digital · ${row.original.digitalType}` : 'Physical'}
        </Badge>
      ),
    },
    {
      accessorKey: 'basePrice',
      header: 'Price',
      cell: ({ row }) => {
        const p = row.original;
        return p.salePrice ? (
          <div className="space-x-1">
            <span className="font-medium">${p.salePrice}</span>
            <span className="text-xs text-muted-foreground line-through">${p.basePrice}</span>
          </div>
        ) : (
          <span className="font-medium">${p.basePrice}</span>
        );
      },
    },
    {
      accessorKey: 'stockQuantity',
      header: 'Stock',
      cell: ({ row }) => (
        <span
          className={
            row.original.stockQuantity === 0
              ? 'text-destructive'
              : row.original.stockQuantity < 10
                ? 'text-warning-foreground'
                : ''
          }
        >
          {row.original.stockQuantity}
        </span>
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
      id: 'categories',
      header: 'Categories',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.productCategories.slice(0, 2).map(({ category }) => (
            <Badge key={category.id} variant="secondary" className="text-xs">
              {category.name}
            </Badge>
          ))}
          {row.original.productCategories.length > 2 ? (
            <Badge variant="outline" className="text-xs">
              +{row.original.productCategories.length - 2}
            </Badge>
          ) : null}
        </div>
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
                    Archive
                  </DropdownMenuItem>
                }
                title={`Archive "${row.original.title}"?`}
                description="The product will be soft-deleted and archived. It won't be visible to customers."
                destructive
                confirmLabel="Archive"
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
        title="Products"
        description="Manage your storefront catalog."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New product
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
        data={products}
        loading={loading}
        searchColumn="title"
        searchPlaceholder="Search products by title…"
        empty={
          <EmptyState
            icon={<Box />}
            title="No products yet"
            description="Create your first product to see it listed here."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Create product
              </Button>
            }
          />
        }
      />

      <ProductFormSheet
        open={creating}
        onOpenChange={(o) => setCreating(o)}
        categories={categories}
        tags={tags}
        onTagAdded={(t) => setTags((prev) => [...prev, t])}
        onCategoryAdded={(c) =>
          setCategories((prev) => [
            ...prev,
            { ...c, children: [], productCount: 0 },
          ])
        }
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <ProductFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        categories={categories}
        tags={tags}
        onTagAdded={(t) => setTags((prev) => [...prev, t])}
        onCategoryAdded={(c) =>
          setCategories((prev) => [
            ...prev,
            { ...c, children: [], productCount: 0 },
          ])
        }
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

// Minimal flat category shape returned by POST /categories (no children hydrated).
type CategoryCreated = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
};

function ProductFormSheet({
  open,
  onOpenChange,
  initial,
  categories,
  tags,
  onTagAdded,
  onCategoryAdded,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Product | null;
  categories: CategoryTreeNode[];
  tags: Tag[];
  onTagAdded: (tag: Tag) => void;
  onCategoryAdded: (category: CategoryCreated) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<CreateProductValues>({
    resolver: zodResolver(CreateProductDto),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      type: 'PHYSICAL',
      basePrice: '0',
      stockQuantity: 0,
      status: 'DRAFT',
      categoryIds: [],
      tagIds: [],
      mainImage: '',
      galleryImages: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      form.reset({
        title: initial.title,
        slug: initial.slug,
        description: initial.description ?? '',
        type: initial.type,
        digitalType: initial.digitalType ?? undefined,
        basePrice: initial.basePrice,
        salePrice: initial.salePrice ?? undefined,
        stockQuantity: initial.stockQuantity,
        status: initial.status,
        categoryIds: initial.productCategories.map((pc) => pc.category.id),
        tagIds: initial.productTags.map((pt) => pt.tag.id),
        mainImage: initial.mainImage ?? '',
        galleryImages: initial.galleryImages ?? [],
      });
    } else {
      form.reset({
        title: '',
        slug: '',
        description: '',
        type: 'PHYSICAL',
        basePrice: '0',
        stockQuantity: 0,
        status: 'DRAFT',
        categoryIds: [],
        tagIds: [],
        mainImage: '',
        galleryImages: [],
      });
    }
  }, [open, initial, form]);

  const type = form.watch('type');
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);

  async function onSubmit(values: CreateProductValues) {
    // Strip empty optionals so backend defaults apply.
    const body: Record<string, unknown> = {
      title: values.title,
      type: values.type,
      basePrice: values.basePrice,
      stockQuantity: values.stockQuantity,
      status: values.status,
    };
    if (values.slug) body.slug = values.slug;
    if (values.description) body.description = values.description;
    if (values.salePrice) body.salePrice = values.salePrice;
    if (values.type === 'DIGITAL' && values.digitalType) body.digitalType = values.digitalType;
    if (values.categoryIds !== undefined) body.categoryIds = values.categoryIds;
    if (values.tagIds !== undefined) body.tagIds = values.tagIds;
    body.mainImage = values.mainImage && values.mainImage.trim() ? values.mainImage : null;
    body.galleryImages = values.galleryImages ?? [];

    try {
      if (initial) {
        await apiFetch(`/products/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Product updated', variant: 'success' });
      } else {
        await apiFetch('/products', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Product created', variant: 'success' });
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
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{initial ? 'Edit product' : 'New product'}</SheetTitle>
          <SheetDescription>
            {initial ? 'Update fields, category assignments, and status.' : 'Fill in the essentials — you can flesh out variants later.'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Blue widget" autoFocus />
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
                  <FormDescription>Leave blank to auto-generate from title.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PHYSICAL">Physical</SelectItem>
                          <SelectItem value="DIGITAL">Digital</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {type === 'DIGITAL' ? (
                <FormField
                  control={form.control}
                  name="digitalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Digital type</FormLabel>
                      <FormControl>
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose one" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FILE_DOWNLOAD">File download</SelectItem>
                            <SelectItem value="SERIAL_KEY">Serial key</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {type === 'DIGITAL' ? (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base price</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale price</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        inputMode="decimal"
                        placeholder="optional"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel>Images</FormLabel>
              <FormControl>
                <ProductGallery
                  gallery={form.watch('galleryImages') ?? []}
                  mainImage={form.watch('mainImage') ?? null}
                  onChange={({ gallery, mainImage }) => {
                    form.setValue('galleryImages', gallery, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    form.setValue('mainImage', mainImage ?? '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  maxImages={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <MultiPicker
                        options={flatCategories.map((c) => ({ id: c.id, label: c.name }))}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        emptyLabel="No categories yet. Add one below:"
                      />
                      <QuickAddInline
                        placeholder="New category name…"
                        endpoint="/categories"
                        onCreated={(created: CategoryCreated) => {
                          onCategoryAdded(created);
                          const cur = form.getValues('categoryIds') ?? [];
                          form.setValue('categoryIds', [...cur, created.id], {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tagIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <MultiPicker
                        options={tags.map((t) => ({ id: t.id, label: t.name }))}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        emptyLabel="No tags yet. Add one below:"
                      />
                      <QuickAddInline
                        placeholder="New tag name…"
                        endpoint="/tags"
                        onCreated={(created: Tag) => {
                          onTagAdded(created);
                          const cur = form.getValues('tagIds') ?? [];
                          form.setValue('tagIds', [...cur, created.id], {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                      />
                    </div>
                  </FormControl>
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

/**
 * Small "add new" input rendered inside the product form for tags/categories.
 * Posts `{ name }` to the given endpoint; the response is passed to `onCreated`,
 * which typically both extends the picker's options list AND auto-selects the
 * new item via `form.setValue`. Slug is auto-generated by the backend.
 */
function QuickAddInline<T extends { id: string; name: string }>({
  placeholder,
  endpoint,
  onCreated,
}: {
  placeholder: string;
  endpoint: string;
  onCreated: (created: T) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const created = await apiFetch<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      });
      onCreated(created);
      setName('');
      toast({ title: `"${created.name}" added`, variant: 'success' });
    } catch (e) {
      toast({
        title: 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Enter would submit the outer product form otherwise.
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="h-8 text-xs"
        disabled={busy}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={submit}
        disabled={busy || !name.trim()}
      >
        {busy ? 'Adding…' : 'Add'}
      </Button>
    </div>
  );
}

function MultiPicker({
  options,
  value,
  onChange,
  emptyLabel,
}: {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  emptyLabel: string;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  const selected = new Set(value);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            className={
              'inline-flex items-center rounded-md border px-2 py-1 text-xs transition-colors ' +
              (active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background hover:bg-accent hover:text-accent-foreground')
            }
            onClick={() => {
              const next = new Set(selected);
              if (active) next.delete(opt.id);
              else next.add(opt.id);
              onChange(Array.from(next));
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function flattenCategories(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const out: CategoryTreeNode[] = [];
  const walk = (n: CategoryTreeNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}
