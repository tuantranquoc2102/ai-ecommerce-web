'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, Plus, TicketPercent } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CreateCouponDto,
  type CouponType,
  type CreateCouponDto as CreateCouponValues,
  type PaginatedCoupons,
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

type Coupon = PaginatedCoupons['items'][number];

const TYPE_BADGE: Record<CouponType, 'default' | 'secondary' | 'outline'> = {
  PERCENTAGE: 'default',
  FIXED_AMOUNT: 'secondary',
  FREE_SHIPPING: 'outline',
};

export default function CouponsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const result = await apiFetch<PaginatedCoupons>('/coupons?pageSize=200');
      setData(result.items);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(coupon: Coupon) {
    try {
      await apiFetch<null>(`/coupons/${coupon.id}`, { method: 'DELETE' });
      toast({ title: 'Coupon deleted', variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<Coupon>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.original.code}</code>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={TYPE_BADGE[row.original.type]}>{row.original.type}</Badge>
      ),
    },
    {
      accessorKey: 'value',
      header: 'Discount',
      cell: ({ row }) => {
        const c = row.original;
        if (c.type === 'PERCENTAGE') return <span>{c.value}%</span>;
        if (c.type === 'FREE_SHIPPING') return <span>Free shipping</span>;
        return <span>{c.value}</span>;
      },
    },
    {
      id: 'usage',
      header: 'Usage',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <span className="text-sm text-muted-foreground">
            {c.usedCount}
            {c.usageLimit !== null ? ` / ${c.usageLimit}` : ' / unlimited'}
          </span>
        );
      },
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
      id: 'time',
      header: 'Window',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="text-xs text-muted-foreground">
            <div>{c.startsAt ? new Date(c.startsAt).toLocaleString() : '(no start)'}</div>
            <div>→ {c.expiresAt ? new Date(c.expiresAt).toLocaleString() : '(no end)'}</div>
          </div>
        );
      },
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
                title={`Delete coupon "${row.original.code}"?`}
                description="Orders already created keep their discount snapshot."
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
        title="Mã giảm giá"
        description="Tạo và quản lý voucher/coupon cho checkout."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New coupon
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
        searchColumn="code"
        searchPlaceholder="Search by code…"
        empty={
          <EmptyState
            icon={<TicketPercent />}
            title="No coupons yet"
            description="Create your first discount voucher."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Create coupon
              </Button>
            }
          />
        }
      />

      <CouponFormSheet
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <CouponFormSheet
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

function CouponFormSheet({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Coupon | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const form = useForm<CreateCouponValues>({
    resolver: zodResolver(CreateCouponDto),
    defaultValues: {
      code: '',
      description: '',
      type: 'PERCENTAGE',
      value: '10',
      minOrderValue: '',
      maxDiscount: '',
      usageLimit: undefined,
      startsAt: undefined,
      expiresAt: undefined,
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      form.reset({
        code: initial.code,
        description: initial.description ?? '',
        type: initial.type,
        value: initial.value,
        minOrderValue: initial.minOrderValue ?? '',
        maxDiscount: initial.maxDiscount ?? '',
        usageLimit: initial.usageLimit ?? undefined,
        startsAt: initial.startsAt ? new Date(initial.startsAt) : undefined,
        expiresAt: initial.expiresAt ? new Date(initial.expiresAt) : undefined,
        isActive: initial.isActive,
      });
    } else {
      form.reset({
        code: '',
        description: '',
        type: 'PERCENTAGE',
        value: '10',
        minOrderValue: '',
        maxDiscount: '',
        usageLimit: undefined,
        startsAt: undefined,
        expiresAt: undefined,
        isActive: true,
      });
    }
  }, [open, initial, form]);

  async function submit(values: CreateCouponValues) {
    const body = {
      code: values.code,
      description: values.description || undefined,
      type: values.type,
      value: values.value,
      minOrderValue: values.minOrderValue || undefined,
      maxDiscount: values.maxDiscount || undefined,
      usageLimit: values.usageLimit,
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
      isActive: values.isActive,
    };
    try {
      if (isEdit && initial) {
        await apiFetch(`/coupons/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Coupon updated', variant: 'success' });
      } else {
        await apiFetch('/coupons', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Coupon created', variant: 'success' });
      }
      onSaved();
    } catch (e) {
      toast({
        title: isEdit ? 'Update failed' : 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const type = form.watch('type');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit coupon' : 'New coupon'}</SheetTitle>
          <SheetDescription>
            Configure voucher logic for checkout validation and discount calculation.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="mt-6 space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="WELCOME10" />
                  </FormControl>
                  <FormDescription>Stored uppercase; customers can type in any case.</FormDescription>
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
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
                  </FormControl>
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
                          <SelectItem value="PERCENTAGE">PERCENTAGE</SelectItem>
                          <SelectItem value="FIXED_AMOUNT">FIXED_AMOUNT</SelectItem>
                          <SelectItem value="FREE_SHIPPING">FREE_SHIPPING</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={type === 'FREE_SHIPPING' ? '0' : (field.value ?? '')}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={type === 'FREE_SHIPPING'}
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
                name="minOrderValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min order value</FormLabel>
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
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        disabled={type === 'FREE_SHIPPING' || type === 'FIXED_AMOUNT'}
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
                name="usageLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usage limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start (optional)</FormLabel>
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
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End (optional)</FormLabel>
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
