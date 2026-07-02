'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ellipsis, LogOut, Plus, Users as UsersIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CreateUserDto,
  UpdateUserDto,
  type CreateUserDto as CreateUserValues,
  type UpdateUserDto as UpdateUserValues,
  type UserStatus,
} from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
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
  useToast,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

type Role = { id: string; code: string; name: string };

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  userRoles: { role: Role }[];
};

type ListUsersResponse = { items: User[]; total: number; page: number; pageSize: number };

const STATUS_VARIANT: Record<UserStatus, 'success' | 'destructive' | 'warning'> = {
  ACTIVE: 'success',
  SUSPENDED: 'destructive',
  PENDING: 'warning',
};

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigningRoles, setAssigningRoles] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [u, r] = await Promise.all([
        apiFetch<ListUsersResponse>('/users?pageSize=200'),
        apiFetch<Role[]>('/roles'),
      ]);
      setUsers(u.items);
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

  async function handleStatus(id: string, next: UserStatus) {
    try {
      await apiFetch<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast({ title: `Status changed to ${next}`, variant: 'success' });
      load();
    } catch (e) {
      toast({
        title: 'Update failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  async function handleRevokeSessions(id: string, email: string) {
    try {
      const res = await apiFetch<{ count: number }>(`/users/${id}/sessions`, {
        method: 'DELETE',
      });
      toast({
        title: `Sessions revoked for ${email}`,
        description: `${res.count} refresh token(s) invalidated.`,
        variant: 'success',
      });
    } catch (e) {
      toast({
        title: 'Failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'email',
      header: 'User',
      cell: ({ row }) => {
        const u = row.original;
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
              <AvatarFallback>{initials(u)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{name || u.email}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'roles',
      header: 'Roles',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.userRoles.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            row.original.userRoles.slice(0, 3).map(({ role }) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                {role.code}
              </Badge>
            ))
          )}
          {row.original.userRoles.length > 3 ? (
            <Badge variant="outline" className="text-xs">
              +{row.original.userRoles.length - 3}
            </Badge>
          ) : null}
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
      accessorKey: 'twoFactorEnabled',
      header: '2FA',
      cell: ({ row }) =>
        row.original.twoFactorEnabled ? (
          <Badge variant="outline" className="text-xs">
            Enabled
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Off</span>
        ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last login',
      cell: ({ row }) =>
        row.original.lastLoginAt ? (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.lastLoginAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Never</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions">
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditing(u)}>Edit profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAssigningRoles(u)}>
                  Assign roles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {u.status === 'ACTIVE' ? (
                  <ConfirmDialog
                    trigger={
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive"
                      >
                        Suspend
                      </DropdownMenuItem>
                    }
                    title={`Suspend ${u.email}?`}
                    description="User will be signed out immediately and prevented from logging back in."
                    destructive
                    confirmLabel="Suspend"
                    onConfirm={() => handleStatus(u.id, 'SUSPENDED')}
                  />
                ) : (
                  <DropdownMenuItem onClick={() => handleStatus(u.id, 'ACTIVE')}>
                    Reactivate
                  </DropdownMenuItem>
                )}
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <LogOut className="size-4" /> Force logout
                    </DropdownMenuItem>
                  }
                  title={`Force logout ${u.email}?`}
                  description="All active refresh tokens will be revoked. User's next silent-refresh will fail."
                  confirmLabel="Revoke sessions"
                  onConfirm={() => handleRevokeSessions(u.id, u.email)}
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
        title="Users"
        description="Staff and customer accounts with roles and access controls."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New user
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
        data={users}
        loading={loading}
        searchColumn="email"
        searchPlaceholder="Search by name, email, or phone…"
        empty={
          <EmptyState
            icon={<UsersIcon />}
            title="No users yet"
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Create user
              </Button>
            }
          />
        }
      />

      <UserFormSheet
        open={creating}
        onOpenChange={setCreating}
        roles={roles}
        onSaved={() => {
          setCreating(false);
          load();
        }}
      />
      <UserFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        roles={roles}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
      <AssignRolesSheet
        open={!!assigningRoles}
        onOpenChange={(o) => !o && setAssigningRoles(null)}
        user={assigningRoles}
        roles={roles}
        onSaved={() => {
          setAssigningRoles(null);
          load();
        }}
      />
    </>
  );
}

function UserFormSheet({
  open,
  onOpenChange,
  initial,
  roles,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: User | null;
  roles: Role[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(CreateUserDto),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      status: 'ACTIVE',
      roleIds: [],
    },
  });

  const updateForm = useForm<UpdateUserValues>({
    resolver: zodResolver(UpdateUserDto),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      updateForm.reset({
        firstName: initial.firstName ?? '',
        lastName: initial.lastName ?? '',
        phone: initial.phone ?? '',
        status: initial.status,
      });
    } else {
      createForm.reset({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        status: 'ACTIVE',
        roleIds: [],
      });
    }
  }, [open, initial, createForm, updateForm]);

  async function onCreate(values: CreateUserValues) {
    try {
      await apiFetch<User>('/users', { method: 'POST', body: JSON.stringify(values) });
      toast({ title: 'User created', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({
        title: 'Create failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  async function onUpdate(values: UpdateUserValues) {
    if (!initial) return;
    try {
      await apiFetch<User>(`/users/${initial.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      toast({ title: 'User updated', variant: 'success' });
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
          <SheetTitle>{isEdit ? 'Edit user' : 'New user'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update profile fields. Use the "Assign roles" action for permissions.'
              : 'Create a staff account with an initial password and roles.'}
          </SheetDescription>
        </SheetHeader>

        {isEdit ? (
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdate)} className="mt-6 space-y-4">
              <div className="rounded-md bg-muted/40 p-3 text-xs">
                <span className="font-medium">{initial?.email}</span>
                <span className="ml-2 text-muted-foreground">(email cannot be changed)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={updateForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={updateForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={updateForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
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
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Suspending revokes active sessions immediately.
                    </FormDescription>
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Minimum 8 characters. User should change it after first login.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="roleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles</FormLabel>
                    <FormControl>
                      <RolePicker
                        roles={roles}
                        value={field.value ?? []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>Assign one or more roles now, or leave empty and assign later.</FormDescription>
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

function AssignRolesSheet({
  open,
  onOpenChange,
  user,
  roles,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: User | null;
  roles: Role[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) setSelected(user.userRoles.map((ur) => ur.role.id));
  }, [open, user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await apiFetch<User>(`/users/${user.id}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roleIds: selected }),
      });
      toast({ title: 'Roles updated', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({
        title: 'Update failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Assign roles</SheetTitle>
          <SheetDescription>
            {user ? user.email : ''}. Replaces all current role assignments.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <RolePicker roles={roles} value={selected} onChange={setSelected} />
          <p className="mt-4 text-xs text-muted-foreground">
            {selected.length} role(s) selected.
          </p>
        </div>

        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RolePicker({
  roles,
  value,
  onChange,
}: {
  roles: Role[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  if (roles.length === 0) {
    return <p className="text-xs text-muted-foreground">No roles defined yet.</p>;
  }
  const selected = new Set(value);
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((r) => {
        const active = selected.has(r.id);
        return (
          <button
            key={r.id}
            type="button"
            className={
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ' +
              (active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background hover:bg-accent hover:text-accent-foreground')
            }
            onClick={() => {
              const next = new Set(selected);
              if (active) next.delete(r.id);
              else next.add(r.id);
              onChange(Array.from(next));
            }}
            title={r.code}
          >
            {r.name}
          </button>
        );
      })}
    </div>
  );
}

function initials(u: User): string {
  const first = u.firstName?.[0] ?? '';
  const last = u.lastName?.[0] ?? '';
  const combo = (first + last).trim().toUpperCase();
  if (combo) return combo;
  return u.email.slice(0, 2).toUpperCase();
}
