'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, KeyRound, Plus, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CreateRoleDto,
  UpdateRoleDto,
  type CreateRoleDto as CreateRoleValues,
  type UpdateRoleDto as UpdateRoleValues,
} from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  cn,
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

type Permission = {
  id: string;
  code: string;
  name: string;
  type: 'MENU' | 'ELEMENT' | 'API';
  urlPath: string | null;
  apiEndpoint: string | null;
  parentId: string | null;
};

type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count?: { userRoles: number; rolePermissions: number };
};

type RoleDetail = Role & {
  rolePermissions: { permission: Permission }[];
};

export default function RolesPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [permMatrixFor, setPermMatrixFor] = useState<Role | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch<Role[]>('/roles');
      setRoles(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(role: Role) {
    try {
      await apiFetch<null>(`/roles/${role.id}`, { method: 'DELETE' });
      toast({ title: `Role "${role.name}" deleted`, variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'code',
      header: 'Role',
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.isSystem ? (
              <Badge variant="outline" className="text-xs">
                System
              </Badge>
            ) : null}
          </div>
          <code className="text-xs text-muted-foreground">{row.original.code}</code>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.description || '—'}
        </span>
      ),
    },
    {
      id: 'users',
      header: 'Users',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original._count?.userRoles ?? 0}
        </span>
      ),
    },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original._count?.rolePermissions ?? 0}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions">
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPermMatrixFor(r)}>
                  <KeyRound className="size-4" /> Manage permissions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditing(r)} disabled={r.isSystem}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive"
                      disabled={r.isSystem}
                    >
                      Delete
                    </DropdownMenuItem>
                  }
                  title={`Delete role "${r.name}"?`}
                  description={
                    (r._count?.userRoles ?? 0) > 0
                      ? `${r._count?.userRoles} user(s) currently hold this role and will lose it.`
                      : 'This cannot be undone.'
                  }
                  destructive
                  confirmLabel="Delete"
                  onConfirm={() => handleDelete(r)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Roles"
        description="Role definitions with dynamic permission assignments. System roles are protected from deletion."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New role
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
        data={roles}
        loading={loading}
        searchColumn="code"
        searchPlaceholder="Search by code or name…"
        empty={
          <EmptyState
            icon={<ShieldCheck />}
            title="No roles yet"
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Create role
              </Button>
            }
          />
        }
      />

      <RoleFormSheet
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <RoleFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
      <PermissionMatrixSheet
        open={!!permMatrixFor}
        onOpenChange={(o) => !o && setPermMatrixFor(null)}
        role={permMatrixFor}
        onSaved={() => {
          setPermMatrixFor(null);
          load();
        }}
      />
    </>
  );
}

function RoleFormSheet({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Role | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const createForm = useForm<CreateRoleValues>({
    resolver: zodResolver(CreateRoleDto),
    defaultValues: { code: '', name: '', description: '' },
  });
  const updateForm = useForm<UpdateRoleValues>({
    resolver: zodResolver(UpdateRoleDto),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      updateForm.reset({
        name: initial.name,
        description: initial.description ?? '',
      });
    } else {
      createForm.reset({ code: '', name: '', description: '' });
    }
  }, [open, initial, createForm, updateForm]);

  async function onCreate(values: CreateRoleValues) {
    try {
      await apiFetch('/roles', { method: 'POST', body: JSON.stringify(values) });
      toast({ title: 'Role created', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({
        title: 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  async function onUpdate(values: UpdateRoleValues) {
    if (!initial) return;
    try {
      await apiFetch(`/roles/${initial.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      toast({ title: 'Role updated', variant: 'success' });
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
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit role' : 'New role'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update role display name and description. Permissions are managed separately.'
              : 'Role code is uppercase snake_case (e.g. CONTENT_EDITOR) and immutable.'}
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
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                        placeholder="CONTENT_EDITOR"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        autoFocus
                      />
                    </FormControl>
                    <FormDescription>Uppercase snake_case. 2-40 chars. Immutable.</FormDescription>
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
                      <Input {...field} placeholder="Content Editor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Manages blog posts, banners, and static pages."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SheetFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createForm.formState.isSubmitting}>
                  {createForm.formState.isSubmitting ? 'Creating…' : 'Create'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PermissionMatrixSheet({
  open,
  onOpenChange,
  role,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  role: Role | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'MENU' | 'API' | 'ELEMENT'>('API');

  useEffect(() => {
    if (!open || !role) return;
    setLoading(true);
    setSearch('');
    (async () => {
      try {
        const [all, detail] = await Promise.all([
          apiFetch<Permission[]>('/permissions'),
          apiFetch<RoleDetail>(`/roles/${role.id}`),
        ]);
        setPermissions(all);
        setSelected(new Set(detail.rolePermissions.map((rp) => rp.permission.id)));
      } catch (e) {
        toast({
          title: 'Failed to load',
          description: (e as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, role, toast]);

  const grouped = useMemo(() => {
    const byType: Record<'MENU' | 'ELEMENT' | 'API', Permission[]> = {
      MENU: [],
      ELEMENT: [],
      API: [],
    };
    for (const p of permissions) byType[p.type].push(p);
    return byType;
  }, [permissions]);

  function filter(list: Permission[]): Permission[] {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.apiEndpoint?.toLowerCase().includes(q) ?? false),
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkToggle(list: Permission[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of list) {
        if (on) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  async function save() {
    if (!role) return;
    setSaving(true);
    try {
      await apiFetch<{ count: number }>(`/roles/${role.id}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permissionIds: Array.from(selected) }),
      });
      toast({
        title: `Permissions updated`,
        description: `${selected.size} permission(s) assigned to ${role.name}.`,
        variant: 'success',
      });
      onSaved();
    } catch (e) {
      toast({
        title: 'Save failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  const activeList = filter(grouped[tab]);
  const allInTabSelected = activeList.length > 0 && activeList.every((p) => selected.has(p.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Permissions for {role?.name}</SheetTitle>
          <SheetDescription>
            Toggle permissions in each tab. Save replaces the role's entire permission set atomically.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="mt-6 space-y-4">
            <Input
              placeholder="Filter by code, name, or endpoint…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Tabs value={tab} onValueChange={(v) => setTab(v as 'MENU' | 'API' | 'ELEMENT')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="API">
                  API <span className="ml-1 text-muted-foreground">({grouped.API.length})</span>
                </TabsTrigger>
                <TabsTrigger value="MENU">
                  Menu <span className="ml-1 text-muted-foreground">({grouped.MENU.length})</span>
                </TabsTrigger>
                <TabsTrigger value="ELEMENT">
                  Element{' '}
                  <span className="ml-1 text-muted-foreground">({grouped.ELEMENT.length})</span>
                </TabsTrigger>
              </TabsList>

              {(['API', 'MENU', 'ELEMENT'] as const).map((t) => {
                const list = filter(grouped[t]);
                const allSelected = list.length > 0 && list.every((p) => selected.has(p.id));
                return (
                  <TabsContent key={t} value={t} className="space-y-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs text-muted-foreground">
                        {list.length} matching · {list.filter((p) => selected.has(p.id)).length} selected
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => bulkToggle(list, !allSelected)}
                        disabled={list.length === 0}
                      >
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </Button>
                    </div>
                    {list.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        {search ? 'No matches for your filter.' : 'No permissions in this group.'}
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {list.map((p) => (
                          <li
                            key={p.id}
                            className={cn(
                              'flex items-start gap-3 py-2.5 pr-2',
                              selected.has(p.id) && 'bg-accent/30',
                            )}
                          >
                            <Checkbox
                              id={`perm-${p.id}`}
                              checked={selected.has(p.id)}
                              onCheckedChange={() => toggle(p.id)}
                              className="mt-0.5"
                            />
                            <label htmlFor={`perm-${p.id}`} className="flex-1 cursor-pointer">
                              <div className="text-sm font-medium">{p.name}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <code className="rounded bg-muted px-1.5 py-0.5">{p.code}</code>
                                {p.apiEndpoint ? (
                                  <span className="font-mono">{p.apiEndpoint}</span>
                                ) : null}
                                {p.urlPath ? (
                                  <span className="font-mono">{p.urlPath}</span>
                                ) : null}
                              </div>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}

        <SheetFooter className="mt-6 border-t pt-4">
          <div className="mr-auto text-xs text-muted-foreground">
            {selected.size} total selected
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
