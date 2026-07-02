'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, KeyRound, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  type CreatePermissionDto as CreatePermissionValues,
  type UpdatePermissionDto as UpdatePermissionValues,
} from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  ConfirmDialog,
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
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

type PermissionType = 'MENU' | 'ELEMENT' | 'API';

type Permission = {
  id: string;
  code: string;
  name: string;
  type: PermissionType;
  urlPath: string | null;
  apiEndpoint: string | null;
  parentId: string | null;
};

const TYPE_BADGE: Record<PermissionType, 'default' | 'secondary' | 'outline'> = {
  API: 'default',
  MENU: 'secondary',
  ELEMENT: 'outline',
};

export default function ResourcesPage() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<PermissionType | 'ALL'>('ALL');

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch<Permission[]>('/permissions');
      setPermissions(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(p: Permission) {
    try {
      await apiFetch<null>(`/permissions/${p.id}`, { method: 'DELETE' });
      toast({ title: `Permission "${p.code}" deleted`, variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const counts = {
    ALL: permissions.length,
    API: permissions.filter((p) => p.type === 'API').length,
    MENU: permissions.filter((p) => p.type === 'MENU').length,
    ELEMENT: permissions.filter((p) => p.type === 'ELEMENT').length,
  };

  const filtered = permissions.filter((p) => {
    if (tab !== 'ALL' && p.type !== tab) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.apiEndpoint?.toLowerCase().includes(q) ?? false) ||
      (p.urlPath?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <>
      <PageHeader
        title="Permissions & Resources"
        description="Registry of all permission codes. Assign to roles from the Roles page. Cache flushes automatically on save."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Register permission
          </Button>
        }
      />

      {err ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-4 flex items-center gap-3">
        <Input
          placeholder="Filter by code, name, or endpoint…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Tabs value={tab} onValueChange={(v) => setTab(v as PermissionType | 'ALL')}>
          <TabsList>
            <TabsTrigger value="ALL">All ({counts.ALL})</TabsTrigger>
            <TabsTrigger value="API">API ({counts.API})</TabsTrigger>
            <TabsTrigger value="MENU">Menu ({counts.MENU})</TabsTrigger>
            <TabsTrigger value="ELEMENT">Element ({counts.ELEMENT})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<KeyRound />}
          title={search ? 'No permissions match your filter' : 'No permissions yet'}
          description="Register API endpoints, menus, and UI element codes to gate access."
          action={
            !search ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Register permission
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <ul className="divide-y">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-start gap-3 p-3 hover:bg-accent/30">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant={TYPE_BADGE[p.type]} className="text-xs">
                      {p.type}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <code className="rounded bg-muted px-1.5 py-0.5">{p.code}</code>
                    {p.apiEndpoint ? (
                      <span className="font-mono">{p.apiEndpoint}</span>
                    ) : null}
                    {p.urlPath ? <span className="font-mono">{p.urlPath}</span> : null}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Actions">
                      <Ellipsis className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(p)}>Edit</DropdownMenuItem>
                    <ConfirmDialog
                      trigger={
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      }
                      title={`Delete permission "${p.code}"?`}
                      description="Any role currently assigned this permission will lose it immediately."
                      destructive
                      confirmLabel="Delete"
                      onConfirm={() => handleDelete(p)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PermissionFormSheet
        open={creating}
        onOpenChange={setCreating}
        allPermissions={permissions}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <PermissionFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        allPermissions={permissions}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

/**
 * Fields shown conditionally based on the selected permission type.
 * Both Create and Update forms share these — extracted so we can render the
 * same block against either form without fighting the union type.
 *
 * TFV is intentionally loose (`any`) because the create schema includes `code`
 * while update doesn't, but both share `type/urlPath/apiEndpoint/parentId`.
 */
function TypeConditionalFields({
  form,
  menuParents,
}: {
  form: UseFormReturn<Record<string, unknown>>;
  menuParents: Permission[];
}) {
  const type = form.watch('type') as PermissionType | undefined;
  if (type === 'API') {
    return (
      <FormField
        control={form.control}
        name="apiEndpoint"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API endpoint</FormLabel>
            <FormControl>
              <Input
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                placeholder="POST /api/v1/products/:id/publish"
              />
            </FormControl>
            <FormDescription>
              Format: <code>METHOD /path</code>. Enforced by permissions guard when routes use{' '}
              <code>@RequirePermission(...)</code>.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }
  if (type === 'MENU') {
    return (
      <>
        <FormField
          control={form.control}
          name="urlPath"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL path</FormLabel>
              <FormControl>
                <Input
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  placeholder="/admin/reports"
                />
              </FormControl>
              <FormDescription>Where the menu item navigates to in the admin panel.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => {
            const v = typeof field.value === 'string' && field.value ? field.value : '__none';
            return (
              <FormItem>
                <FormLabel>Parent menu (optional)</FormLabel>
                <FormControl>
                  <Select
                    value={v}
                    onValueChange={(x) => field.onChange(x === '__none' ? '' : x)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="(top-level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">(top-level)</SelectItem>
                      {menuParents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{' '}
                          <span className="text-muted-foreground">({p.code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </>
    );
  }
  return null;
}

function PermissionFormSheet({
  open,
  onOpenChange,
  initial,
  allPermissions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Permission | null;
  allPermissions: Permission[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const createForm = useForm<CreatePermissionValues>({
    resolver: zodResolver(CreatePermissionDto),
    defaultValues: {
      code: '',
      name: '',
      type: 'API',
      urlPath: '',
      apiEndpoint: '',
      parentId: '',
    },
  });
  const updateForm = useForm<UpdatePermissionValues>({
    resolver: zodResolver(UpdatePermissionDto),
    defaultValues: {
      name: '',
      type: 'API',
      urlPath: '',
      apiEndpoint: '',
      parentId: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      updateForm.reset({
        name: initial.name,
        type: initial.type,
        urlPath: initial.urlPath ?? '',
        apiEndpoint: initial.apiEndpoint ?? '',
        parentId: initial.parentId ?? '',
      });
    } else {
      createForm.reset({
        code: '',
        name: '',
        type: 'API',
        urlPath: '',
        apiEndpoint: '',
        parentId: '',
      });
    }
  }, [open, initial, createForm, updateForm]);

  const menuParents = allPermissions.filter(
    (p) => p.type === 'MENU' && p.id !== initial?.id,
  );

  async function onCreate(values: CreatePermissionValues) {
    const body: Record<string, unknown> = {
      code: values.code,
      name: values.name,
      type: values.type,
    };
    if (values.urlPath) body.urlPath = values.urlPath;
    if (values.apiEndpoint) body.apiEndpoint = values.apiEndpoint;
    if (values.parentId) body.parentId = values.parentId;
    try {
      await apiFetch('/permissions', { method: 'POST', body: JSON.stringify(body) });
      toast({ title: 'Permission registered', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({
        title: 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  async function onUpdate(values: UpdatePermissionValues) {
    if (!initial) return;
    const body: Record<string, unknown> = {
      name: values.name,
      type: values.type,
    };
    body.urlPath = values.urlPath && values.urlPath.trim() ? values.urlPath : null;
    body.apiEndpoint =
      values.apiEndpoint && values.apiEndpoint.trim() ? values.apiEndpoint : null;
    body.parentId = values.parentId && values.parentId.trim() ? values.parentId : null;
    try {
      await apiFetch(`/permissions/${initial.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      toast({ title: 'Permission updated', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({
        title: 'Update failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit permission' : 'Register permission'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the display name, endpoint, or parent. Code is immutable.'
              : 'Register a new API endpoint, menu item, or UI element for RBAC gating. Saving flushes the permission cache.'}
          </SheetDescription>
        </SheetHeader>

        {isEdit ? (
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdate)} className="mt-6 space-y-4">
              <div className="rounded-md bg-muted/40 p-3">
                <code className="text-xs font-medium">{initial?.code}</code>
                <span className="ml-2 text-xs text-muted-foreground">(immutable)</span>
              </div>

              <FormField
                control={updateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="Publish product" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={updateForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Select value={field.value ?? 'API'} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="API">API endpoint</SelectItem>
                          <SelectItem value="MENU">Menu item (UI nav)</SelectItem>
                          <SelectItem value="ELEMENT">UI element (button/section)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TypeConditionalFields
                form={updateForm as unknown as UseFormReturn<Record<string, unknown>>}
                menuParents={menuParents}
              />

              <SheetFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateForm.formState.isSubmitting}>
                  {updateForm.formState.isSubmitting ? 'Saving…' : 'Save'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        ) : (
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreate)} className="mt-6 space-y-4">
              <FormField
                control={createForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="product.publish"
                        onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                        autoFocus
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase, dot-separated. e.g. <code>product.publish</code>,{' '}
                      <code>menu.reports</code>.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Publish product" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
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
                          <SelectItem value="API">API endpoint</SelectItem>
                          <SelectItem value="MENU">Menu item (UI nav)</SelectItem>
                          <SelectItem value="ELEMENT">UI element (button/section)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TypeConditionalFields
                form={createForm as unknown as UseFormReturn<Record<string, unknown>>}
                menuParents={menuParents}
              />

              <SheetFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createForm.formState.isSubmitting}>
                  {createForm.formState.isSubmitting ? 'Registering…' : 'Register'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
