'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, Plus, Users } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@ecom/ui';
import type {
  CreateCustomerGroupDto,
  CustomerGroupRules,
  CustomerGroupType,
  CustomerGroupView,
  PaginatedCustomerGroups,
  UpdateCustomerGroupDto,
  UserStatus,
} from '@ecom/shared';
import { ApiError, apiFetch } from '@/lib/api-client';

const PAGE_SIZE = 50;

const TYPE_VARIANT: Record<CustomerGroupType, 'default' | 'secondary'> = {
  MANUAL: 'secondary',
  DYNAMIC: 'default',
};

interface GroupFormState {
  name: string;
  color: string;
  description: string;
  type: CustomerGroupType;
  minTotalSpent: string;
  minOrderCount: string;
  lastOrderWithinDays: string;
  status: UserStatus | 'ANY';
}

const EMPTY_FORM: GroupFormState = {
  name: '',
  color: '',
  description: '',
  type: 'MANUAL',
  minTotalSpent: '',
  minOrderCount: '',
  lastOrderWithinDays: '',
  status: 'ANY',
};

/** Build the DYNAMIC rules object from form fields, dropping empty inputs. */
function buildRules(form: GroupFormState): CustomerGroupRules {
  const rules: CustomerGroupRules = {};
  if (form.minTotalSpent.trim()) rules.minTotalSpent = Number(form.minTotalSpent);
  if (form.minOrderCount.trim()) rules.minOrderCount = Number(form.minOrderCount);
  if (form.lastOrderWithinDays.trim()) rules.lastOrderWithinDays = Number(form.lastOrderWithinDays);
  if (form.status !== 'ANY') rules.status = form.status;
  return rules;
}

export default function CustomerGroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<CustomerGroupView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  // Create / edit dialog state.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerGroupView | null>(null);
  const [form, setForm] = useState<GroupFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('pageSize', String(PAGE_SIZE));
      if (committedSearch) qs.set('search', committedSearch);
      const result = await apiFetch<PaginatedCustomerGroups>(`/customer-groups?${qs.toString()}`);
      setGroups(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      setGroups([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, committedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  function applySearch() {
    setCommittedSearch(search.trim());
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(group: CustomerGroupView) {
    setEditing(group);
    setForm({
      name: group.name,
      color: group.color ?? '',
      description: group.description ?? '',
      type: group.type,
      minTotalSpent: group.rules?.minTotalSpent?.toString() ?? '',
      minOrderCount: group.rules?.minOrderCount?.toString() ?? '',
      lastOrderWithinDays: group.rules?.lastOrderWithinDays?.toString() ?? '',
      status: group.rules?.status ?? 'ANY',
    });
    setDialogOpen(true);
  }

  async function saveGroup() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const body: UpdateCustomerGroupDto = {
          name: form.name.trim(),
          color: form.color.trim() || undefined,
          description: form.description.trim() || undefined,
          type: form.type,
          rules: form.type === 'DYNAMIC' ? buildRules(form) : undefined,
        };
        await apiFetch<CustomerGroupView>(`/customer-groups/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        toast({ title: 'Group updated', variant: 'success' });
      } else {
        const body: CreateCustomerGroupDto = {
          name: form.name.trim(),
          color: form.color.trim() || undefined,
          description: form.description.trim() || undefined,
          type: form.type,
          rules: form.type === 'DYNAMIC' ? buildRules(form) : undefined,
        };
        await apiFetch<CustomerGroupView>('/customer-groups', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        toast({ title: 'Group created', variant: 'success' });
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup(group: CustomerGroupView) {
    try {
      await apiFetch<null>(`/customer-groups/${group.id}`, { method: 'DELETE' });
      toast({ title: 'Group deleted', variant: 'success' });
      await load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  const columns: ColumnDef<CustomerGroupView>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          href={`/admin/customers/groups/${row.original.id}` as Route}
          className="flex items-center gap-2 font-medium hover:underline"
        >
          <span
            className="size-3 shrink-0 rounded-full border"
            style={{ backgroundColor: row.original.color ?? 'transparent' }}
            aria-hidden
          />
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={TYPE_VARIANT[row.original.type]}>{row.original.type}</Badge>
      ),
    },
    {
      accessorKey: 'memberCount',
      header: 'Members',
      cell: ({ row }) => <span className="text-sm">{row.original.memberCount}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
            Edit
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-destructive">
                Delete
              </Button>
            }
            title="Delete this group?"
            description={`"${row.original.name}" will be removed. This cannot be undone.`}
            destructive
            confirmLabel="Delete"
            onConfirm={() => deleteGroup(row.original)}
          />
        </div>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Customer groups"
        description="Segment customers by behaviour and value."
        actions={
          <Button onClick={openCreate}>
            <Plus /> New group
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grow min-w-[200px]">
          <Input
            placeholder="Search groups by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch();
            }}
          />
        </div>
        <Button variant="outline" onClick={applySearch} disabled={loading}>
          Search
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        columns={columns}
        data={groups}
        loading={loading}
        pageSize={PAGE_SIZE}
        hidePagination
        empty={
          <EmptyState
            icon={<Users />}
            title="No groups yet"
            description="Create a group to segment your customers."
            action={
              <Button onClick={openCreate}>
                <Plus /> New group
              </Button>
            }
          />
        }
      />

      <div className="mt-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} · {total} total
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => (!saving ? setDialogOpen(o) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit group' : 'New group'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update this customer group.'
                : 'Create a group to segment customers manually or by rules.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. VIP customers"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="group-color">Color</Label>
              <Input
                id="group-color"
                type="color"
                value={form.color || '#000000'}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-20 p-1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="group-description">Description</Label>
              <Textarea
                id="group-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What defines this group?"
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as CustomerGroupType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">MANUAL — members added by hand</SelectItem>
                  <SelectItem value="DYNAMIC">DYNAMIC — members matched by rules</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === 'DYNAMIC' ? (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Members match when they satisfy all provided rules.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rule-spent" className="text-xs">
                      Min total spent
                    </Label>
                    <Input
                      id="rule-spent"
                      inputMode="decimal"
                      value={form.minTotalSpent}
                      onChange={(e) => setForm((f) => ({ ...f, minTotalSpent: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rule-orders" className="text-xs">
                      Min order count
                    </Label>
                    <Input
                      id="rule-orders"
                      inputMode="numeric"
                      value={form.minOrderCount}
                      onChange={(e) => setForm((f) => ({ ...f, minOrderCount: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rule-recency" className="text-xs">
                      Last order within (days)
                    </Label>
                    <Input
                      id="rule-recency"
                      inputMode="numeric"
                      value={form.lastOrderWithinDays}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lastOrderWithinDays: e.target.value }))
                      }
                      placeholder="e.g. 90"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, status: v as UserStatus | 'ANY' }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANY">Any</SelectItem>
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                        <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                        <SelectItem value="PENDING">PENDING</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveGroup} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? 'Save changes' : 'Create group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
