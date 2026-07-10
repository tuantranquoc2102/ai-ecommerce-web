'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, Flame, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CreatePromotionDto,
  type CreatePromotionDto as CreatePromotionValues,
  type PaginatedPromotions,
  type PromotionDiscountType,
  type PromotionKind,
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
  Switch,
  Textarea,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';
import { revalidateStorefront } from '@/lib/revalidate';

type Promotion = PaginatedPromotions['items'][number];
type ProductOption = { id: string; title: string; slug: string; status: string };
type ProductList = { items: ProductOption[]; total: number; page: number; pageSize: number };

const KIND_VARIANT: Record<PromotionKind, 'default' | 'secondary'> = {
  FLASH_SALE: 'default',
  CAMPAIGN: 'secondary',
};

const DISCOUNT_LABEL: Record<PromotionDiscountType, string> = {
  PERCENTAGE: '%',
  FIXED_AMOUNT: 'fixed',
  SET_PRICE: 'set-price',
};

export default function PromotionsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [promotions, prod] = await Promise.all([
        apiFetch<PaginatedPromotions>('/promotions?pageSize=200'),
        apiFetch<ProductList>('/products?pageSize=200'),
      ]);
      setData(promotions.items);
      setProducts(prod.items);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(promotion: Promotion) {
    try {
      await apiFetch<null>(`/promotions/${promotion.id}`, { method: 'DELETE' });
      toast({ title: 'Promotion deleted', variant: 'success' });
      await revalidateStorefront(['products', 'pages']);
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<Promotion>[] = [
    {
      accessorKey: 'name',
      header: 'Promotion',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.code ? (
            <code className="text-xs text-muted-foreground">{row.original.code}</code>
          ) : null}
        </div>
      ),
    },
    {
      id: 'kind',
      header: 'Kind',
      cell: ({ row }) => (
        <Badge variant={KIND_VARIANT[row.original.kind]}>{row.original.kind}</Badge>
      ),
    },
    {
      id: 'discount',
      header: 'Discount',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.discountValue} ({DISCOUNT_LABEL[row.original.discountType]})
        </span>
      ),
    },
    {
      id: 'scope',
      header: 'Scope',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.appliesToAllProducts
            ? 'All active products'
            : row.original.productCount < 0
              ? 'All products'
              : `${row.original.productCount} product(s)`}
        </span>
      ),
    },
    {
      id: 'window',
      header: 'Window',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">
          <div>{row.original.startsAt ? new Date(row.original.startsAt).toLocaleString() : '(no start)'}</div>
          <div>→ {row.original.endsAt ? new Date(row.original.endsAt).toLocaleString() : '(no end)'}</div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
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
                title={`Delete promotion "${row.original.name}"?`}
                description="Storefront prices will fallback to base/sale prices after revalidation."
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
        title="Chương trình khuyến mãi"
        description="Thiết lập flash sale và các campaign giảm giá theo lịch."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New promotion
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
        searchPlaceholder="Search promotions…"
        empty={
          <EmptyState
            icon={<Flame />}
            title="No promotions yet"
            description="Create your first flash sale or discount campaign."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Create promotion
              </Button>
            }
          />
        }
      />

      <PromotionFormSheet
        open={creating}
        onOpenChange={setCreating}
        products={products}
        onSaved={async () => {
          setCreating(false);
          await revalidateStorefront(['products', 'pages']);
          load();
        }}
      />
      <PromotionFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        products={products}
        onSaved={async () => {
          setEditing(null);
          await revalidateStorefront(['products', 'pages']);
          load();
        }}
      />
    </>
  );
}

function PromotionFormSheet({
  open,
  onOpenChange,
  initial,
  products,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Promotion | null;
  products: ProductOption[];
  onSaved: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [search, setSearch] = useState('');

  const form = useForm<CreatePromotionValues>({
    resolver: zodResolver(CreatePromotionDto),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      kind: 'CAMPAIGN',
      discountType: 'PERCENTAGE',
      discountValue: '10',
      maxDiscount: '',
      startsAt: undefined,
      endsAt: undefined,
      isActive: true,
      priority: 0,
      appliesToAllProducts: false,
      productIds: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    setSearch('');
    if (initial) {
      form.reset({
        name: initial.name,
        code: initial.code ?? '',
        description: initial.description ?? '',
        kind: initial.kind,
        discountType: initial.discountType,
        discountValue: initial.discountValue,
        maxDiscount: initial.maxDiscount ?? '',
        startsAt: initial.startsAt ? new Date(initial.startsAt) : undefined,
        endsAt: initial.endsAt ? new Date(initial.endsAt) : undefined,
        isActive: initial.isActive,
        priority: initial.priority,
        appliesToAllProducts: initial.appliesToAllProducts,
        productIds: initial.productIds,
      });
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
        kind: 'CAMPAIGN',
        discountType: 'PERCENTAGE',
        discountValue: '10',
        maxDiscount: '',
        startsAt: undefined,
        endsAt: undefined,
        isActive: true,
        priority: 0,
        appliesToAllProducts: false,
        productIds: [],
      });
    }
  }, [open, initial, form]);

  const appliesToAllProducts = form.watch('appliesToAllProducts');
  const selectedIds = form.watch('productIds') ?? [];
  const discountType = form.watch('discountType');

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
    );
  }, [products, search]);

  async function submit(values: CreatePromotionValues) {
    const body = {
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      kind: values.kind,
      discountType: values.discountType,
      discountValue: values.discountValue,
      maxDiscount: values.maxDiscount || undefined,
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
      endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : undefined,
      isActive: values.isActive,
      priority: values.priority,
      appliesToAllProducts: values.appliesToAllProducts,
      productIds: values.appliesToAllProducts ? [] : values.productIds,
    };
    try {
      if (isEdit && initial) {
        await apiFetch(`/promotions/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Promotion updated', variant: 'success' });
      } else {
        await apiFetch('/promotions', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Promotion created', variant: 'success' });
      }
      await onSaved();
    } catch (e) {
      toast({
        title: isEdit ? 'Update failed' : 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  function toggleProduct(productId: string) {
    const current = form.getValues('productIds') ?? [];
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    form.setValue('productIds', next, { shouldValidate: true });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit promotion' : 'New promotion'}</SheetTitle>
          <SheetDescription>
            Flash sale and campaign pricing are evaluated at runtime by active time window and priority.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="Summer Flash Sale" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="FLASH24H" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kind</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FLASH_SALE">FLASH_SALE</SelectItem>
                          <SelectItem value="CAMPAIGN">CAMPAIGN</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">PERCENTAGE</SelectItem>
                          <SelectItem value="FIXED_AMOUNT">FIXED_AMOUNT</SelectItem>
                          <SelectItem value="SET_PRICE">SET_PRICE</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxDiscount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max discount</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} disabled={discountType === 'SET_PRICE'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={-100}
                        max={100}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Higher wins on overlap.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={toLocalInput(field.value)}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={toLocalInput(field.value)}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <div className="flex h-9 items-center gap-2">
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="appliesToAllProducts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <FormControl>
                      <div className="flex h-9 items-center gap-2">
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? 'All products' : 'Selected products'}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel>Products</FormLabel>
              <FormControl>
                <div className="rounded-md border p-3">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search product by title or slug"
                    disabled={appliesToAllProducts}
                  />
                  <div className="mt-2 h-52 overflow-y-auto">
                    <div className="space-y-1 pr-2">
                      {filteredProducts.map((p) => {
                        const checked = selectedIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={appliesToAllProducts}
                              onChange={() => toggleProduct(p.id)}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm">{p.title}</div>
                              <div className="truncate text-xs text-muted-foreground">{p.slug}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                Leave empty only when "All products" is enabled.
              </FormDescription>
              {form.formState.errors.productIds?.message ? (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.productIds?.message as string}
                </p>
              ) : null}
            </FormItem>

            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function toLocalInput(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
