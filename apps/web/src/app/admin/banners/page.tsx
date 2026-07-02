'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, ImageIcon, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CreateBannerDto,
  UpdateBannerDto,
  type CreateBannerDto as CreateBannerValues,
  type UpdateBannerDto as UpdateBannerValues,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';
import { ImageUpload } from '@/components/image-upload';

type Banner = {
  id: string;
  position: string;
  imageUrl: string;
  targetUrl: string | null;
  altText: string | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  isActive: boolean;
  sortOrder: number;
  clickCount: number;
  impressionCount: number;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = { items: Banner[]; total: number; page: number; pageSize: number };

export default function BannersPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch<ListResponse>('/banners?pageSize=200');
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

  async function handleDelete(b: Banner) {
    try {
      await apiFetch<null>(`/banners/${b.id}`, { method: 'DELETE' });
      toast({ title: 'Banner deleted', variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<Banner>[] = [
    {
      accessorKey: 'imageUrl',
      header: 'Preview',
      cell: ({ row }) => (
        <img
          src={row.original.imageUrl}
          alt={row.original.altText ?? ''}
          className="h-12 w-20 rounded object-cover"
        />
      ),
    },
    {
      accessorKey: 'position',
      header: 'Position',
      cell: ({ row }) => (
        <div>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.original.position}</code>
          {row.original.targetUrl ? (
            <div className="mt-0.5 text-xs text-muted-foreground">→ {truncate(row.original.targetUrl, 40)}</div>
          ) : null}
        </div>
      ),
    },
    {
      id: 'schedule',
      header: 'Schedule',
      cell: ({ row }) => {
        const s = row.original.scheduleStart;
        const e = row.original.scheduleEnd;
        if (!s && !e) return <span className="text-xs text-muted-foreground">Always on</span>;
        return (
          <div className="text-xs text-muted-foreground">
            <div>{s ? new Date(s).toLocaleString() : '(no start)'}</div>
            <div>→ {e ? new Date(e).toLocaleString() : '(no end)'}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'ctr',
      header: 'CTR',
      cell: ({ row }) => {
        const b = row.original;
        const ctr = b.impressionCount > 0 ? (b.clickCount / b.impressionCount) * 100 : null;
        return (
          <div className="text-xs">
            <div>
              <span className="font-medium">{b.clickCount}</span> clicks
            </div>
            <div className="text-muted-foreground">
              {b.impressionCount} views ·{' '}
              {ctr !== null ? <span>{ctr.toFixed(1)}%</span> : '—'}
            </div>
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
                title="Delete this banner?"
                description="Click/impression stats will be lost."
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
        title="Banners"
        description="Promotional images placed at named positions. Schedule start/end for auto-activation. Expired banners auto-deactivate every minute."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New banner
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
        searchColumn="position"
        searchPlaceholder="Filter by position slot…"
        empty={
          <EmptyState
            icon={<ImageIcon />}
            title="No banners yet"
            description="Place your first banner at a storefront slot like home_hero."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Create banner
              </Button>
            }
          />
        }
      />

      <BannerFormSheet
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <BannerFormSheet
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

function BannerFormSheet({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Banner | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const createForm = useForm<CreateBannerValues>({
    resolver: zodResolver(CreateBannerDto),
    defaultValues: {
      position: '',
      imageUrl: '',
      targetUrl: '',
      altText: '',
      isActive: false,
      sortOrder: 0,
    },
  });
  const updateForm = useForm<UpdateBannerValues>({
    resolver: zodResolver(UpdateBannerDto),
    defaultValues: {
      position: '',
      imageUrl: '',
      targetUrl: '',
      altText: '',
      isActive: false,
      sortOrder: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      updateForm.reset({
        position: initial.position,
        imageUrl: initial.imageUrl,
        targetUrl: initial.targetUrl ?? '',
        altText: initial.altText ?? '',
        scheduleStart: initial.scheduleStart ? new Date(initial.scheduleStart) : undefined,
        scheduleEnd: initial.scheduleEnd ? new Date(initial.scheduleEnd) : undefined,
        isActive: initial.isActive,
        sortOrder: initial.sortOrder,
      });
    } else {
      createForm.reset({
        position: '',
        imageUrl: '',
        targetUrl: '',
        altText: '',
        isActive: false,
        sortOrder: 0,
      });
    }
  }, [open, initial, createForm, updateForm]);

  async function submit() {
    const ok = isEdit ? await updateForm.trigger() : await createForm.trigger();
    if (!ok) return;
    const values = isEdit ? updateForm.getValues() : createForm.getValues();

    const body: Record<string, unknown> = {
      position: values.position,
      imageUrl: values.imageUrl,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
    };
    body.targetUrl = values.targetUrl && values.targetUrl.trim() ? values.targetUrl : null;
    body.altText = values.altText && values.altText.trim() ? values.altText : null;
    body.scheduleStart = values.scheduleStart ? new Date(values.scheduleStart).toISOString() : null;
    body.scheduleEnd = values.scheduleEnd ? new Date(values.scheduleEnd).toISOString() : null;

    try {
      if (isEdit && initial) {
        await apiFetch(`/banners/${initial.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Banner updated', variant: 'success' });
      } else {
        await apiFetch('/banners', { method: 'POST', body: JSON.stringify(body) });
        toast({ title: 'Banner created', variant: 'success' });
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

  const active = isEdit ? updateForm : createForm;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit banner' : 'New banner'}</SheetTitle>
          <SheetDescription>
            Uploaded via S3/MinIO. Schedule dates are inclusive — a banner activates at Start and
            auto-deactivates at End (checked every minute).
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
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value ?? ''}
                      onChange={(url) => field.onChange(url ?? '')}
                      folder="banners"
                      aspect="video"
                      className="w-64"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={active.control as typeof createForm.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position slot</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="home_hero" />
                  </FormControl>
                  <FormDescription>
                    Free-form key. Storefront layouts pick banners by matching this slot.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={active.control as typeof createForm.control}
              name="targetUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="https://example.com/promo" />
                  </FormControl>
                  <FormDescription>Where clicks navigate. Optional.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={active.control as typeof createForm.control}
              name="altText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alt text</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Accessibility — describes the image to screen readers.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={active.control as typeof createForm.control}
                name="scheduleStart"
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
                control={active.control as typeof createForm.control}
                name="scheduleEnd"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={active.control as typeof createForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Lower renders first.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={active.control as typeof createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <div className="flex h-9 items-center gap-2">
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? 'Live to storefront' : 'Hidden'}
                        </span>
                      </div>
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

/** Format a Date (or ISO string) for a native <input type="datetime-local"> value. */
function toLocalInput(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
