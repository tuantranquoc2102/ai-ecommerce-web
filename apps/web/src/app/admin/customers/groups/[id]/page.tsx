'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, UserPlus, Users } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Checkbox,
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
  PageHeader,
  Separator,
  useToast,
} from '@ecom/ui';
import type {
  CustomerGroupMemberView,
  CustomerGroupView,
} from '@ecom/shared';
import { ApiError, apiFetch } from '@/lib/api-client';
import { customerName, type AdminUser, type ListUsers } from '@/lib/admin/customer';

export default function CustomerGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();

  const [group, setGroup] = useState<CustomerGroupView | null>(null);
  const [members, setMembers] = useState<CustomerGroupMemberView[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  // Add-members dialog.
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const loadGroup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<CustomerGroupView>(`/customer-groups/${id}`);
      setGroup(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const result = await apiFetch<CustomerGroupMemberView[]>(`/customer-groups/${id}/members`);
      setMembers(result);
    } catch (e) {
      toast({
        title: 'Failed to load members',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadGroup();
    loadMembers();
  }, [loadGroup, loadMembers]);

  async function searchCustomers() {
    setSearching(true);
    try {
      const qs = new URLSearchParams();
      qs.set('roleCode', 'CUSTOMER');
      qs.set('pageSize', '20');
      if (search.trim()) qs.set('search', search.trim());
      const result = await apiFetch<ListUsers>(`/users?${qs.toString()}`);
      const existing = new Set(members.map((m) => m.userId));
      setResults(result.items.filter((u) => !existing.has(u.id)));
    } catch (e) {
      toast({
        title: 'Search failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function openAdd() {
    setSearch('');
    setResults([]);
    setSelected(new Set());
    setAddOpen(true);
  }

  function toggleSelected(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function addMembers() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      await apiFetch<unknown>(`/customer-groups/${id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userIds: Array.from(selected) }),
      });
      toast({ title: `Added ${selected.size} member(s)`, variant: 'success' });
      setAddOpen(false);
      await Promise.all([loadMembers(), loadGroup()]);
    } catch (e) {
      toast({
        title: 'Failed to add members',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(userId: string) {
    try {
      await apiFetch<null>(`/customer-groups/${id}/members/${userId}`, { method: 'DELETE' });
      toast({ title: 'Member removed', variant: 'success' });
      await Promise.all([loadMembers(), loadGroup()]);
    } catch (e) {
      toast({
        title: 'Failed to remove member',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    }
  }

  async function recompute() {
    setRecomputing(true);
    try {
      await apiFetch<unknown>(`/customer-groups/${id}/recompute`, { method: 'POST' });
      toast({ title: 'Members recomputed', variant: 'success' });
      await Promise.all([loadMembers(), loadGroup()]);
    } catch (e) {
      toast({
        title: 'Recompute failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setRecomputing(false);
    }
  }

  const isManual = group?.type === 'MANUAL';

  const memberColumns: ColumnDef<CustomerGroupMemberView>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          href={`/admin/customers/${row.original.userId}`}
          className="font-medium hover:underline"
        >
          {customerName(row.original)}
        </Link>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-sm">{row.original.email}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs">
          {row.original.status}
        </Badge>
      ),
    },
    ...(isManual
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
              <div className="flex justify-end">
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Remove
                    </Button>
                  }
                  title="Remove this member?"
                  description={`${customerName(row.original)} will be removed from this group.`}
                  destructive
                  confirmLabel="Remove"
                  onConfirm={() => removeMember(row.original.userId)}
                />
              </div>
            ),
          } as ColumnDef<CustomerGroupMemberView>,
        ]
      : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading group…
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/customers/groups">
            <ArrowLeft className="size-4" />
            Back to groups
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error ?? 'Group not found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/admin/customers/groups">
          <ArrowLeft className="size-4" />
          Groups
        </Link>
      </Button>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span
              className="size-4 shrink-0 rounded-full border"
              style={{ backgroundColor: group.color ?? 'transparent' }}
              aria-hidden
            />
            <span>{group.name}</span>
            <Badge variant={group.type === 'DYNAMIC' ? 'default' : 'secondary'}>{group.type}</Badge>
          </span>
        }
        description={group.description ?? undefined}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="p-5 lg:h-fit">
          <h2 className="text-sm font-semibold">Group info</h2>
          <Separator className="my-3" />
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Members</dt>
              <dd className="font-medium">{group.memberCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{group.type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">{new Date(group.createdAt).toLocaleString()}</dd>
            </div>
          </dl>

          {group.type === 'DYNAMIC' ? (
            <>
              <Separator className="my-4" />
              <h3 className="text-sm font-semibold">Membership rules</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Members are auto-derived from these rules. Recompute to refresh.
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                {group.rules?.minTotalSpent != null ? (
                  <RuleRow label="Min total spent" value={String(group.rules.minTotalSpent)} />
                ) : null}
                {group.rules?.minOrderCount != null ? (
                  <RuleRow label="Min order count" value={String(group.rules.minOrderCount)} />
                ) : null}
                {group.rules?.lastOrderWithinDays != null ? (
                  <RuleRow
                    label="Last order within"
                    value={`${group.rules.lastOrderWithinDays} days`}
                  />
                ) : null}
                {group.rules?.status ? (
                  <RuleRow label="Status" value={group.rules.status} />
                ) : null}
                {!group.rules ||
                (group.rules.minTotalSpent == null &&
                  group.rules.minOrderCount == null &&
                  group.rules.lastOrderWithinDays == null &&
                  !group.rules.status) ? (
                  <p className="text-xs text-muted-foreground">No rules configured.</p>
                ) : null}
              </dl>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={recompute}
                disabled={recomputing}
              >
                {recomputing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Recompute members
              </Button>
            </>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Members</h2>
            {isManual ? (
              <Button size="sm" onClick={openAdd}>
                <UserPlus className="size-4" /> Add members
              </Button>
            ) : null}
          </div>
          <Separator className="my-3" />
          <DataTable
            columns={memberColumns}
            data={members}
            loading={membersLoading}
            hidePagination
            empty={
              <EmptyState
                icon={<Users />}
                title="No members"
                description={
                  isManual
                    ? 'Add customers to this group.'
                    : 'No customers match these rules yet. Try recomputing.'
                }
              />
            }
          />
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={(o) => (!adding ? setAddOpen(o) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add members</DialogTitle>
            <DialogDescription>
              Search customers and select who to add to this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, email or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchCustomers();
                }}
              />
              <Button variant="outline" onClick={searchCustomers} disabled={searching}>
                {searching ? <Loader2 className="size-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-1">
              {results.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {searching ? 'Searching…' : 'No customers to show. Try a search.'}
                </p>
              ) : (
                results.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.has(u.id)}
                      onCheckedChange={() => toggleSelected(u.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{customerName(u)}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={addMembers} disabled={adding || selected.size === 0}>
              {adding ? <Loader2 className="size-4 animate-spin" /> : null}
              Add {selected.size > 0 ? `${selected.size} ` : ''}member{selected.size === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
