'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Loader2, Plus, Users } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
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
  useToast,
} from '@ecom/ui';
import type { CreateUserDto, UserStatus } from '@ecom/shared';
import { ApiError, apiFetch } from '@/lib/api-client';
import {
  customerName,
  USER_STATUS_VARIANT,
  type AdminUser,
  type ListUsers,
} from '@/lib/admin/customer';

const PAGE_SIZE = 20;

const columns: ColumnDef<AdminUser>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <Link
        href={`/admin/customers/${row.original.id}` as Route}
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
      <Badge variant={USER_STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.phone ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Joined',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  },
];

interface NewCustomerForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: UserStatus;
}

const EMPTY_CUSTOMER: NewCustomerForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  status: 'ACTIVE',
};

/** Escape a value for CSV: wrap in quotes and double any embedded quotes. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  // New customer dialog.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NewCustomerForm>(EMPTY_CUSTOMER);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('pageSize', String(PAGE_SIZE));
      qs.set('roleCode', 'CUSTOMER'); // Customers screen only lists CUSTOMER-role users.
      if (committedSearch) qs.set('search', committedSearch);
      const result = await apiFetch<ListUsers>(`/users?${qs.toString()}`);
      setUsers(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      setUsers([]);
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
    setForm(EMPTY_CUSTOMER);
    setDialogOpen(true);
  }

  async function createCustomer() {
    if (!form.email.trim() || form.password.length < 8) return;
    setCreating(true);
    try {
      const body: CreateUserDto = {
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        status: form.status,
        roleCodes: ['CUSTOMER'],
      };
      await apiFetch<AdminUser>('/users', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast({ title: 'Customer created', variant: 'success' });
      setDialogOpen(false);
      setPage(1);
      setCommittedSearch('');
      await load();
    } catch (e) {
      toast({
        title: 'Create failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const qs = new URLSearchParams();
      qs.set('roleCode', 'CUSTOMER');
      qs.set('pageSize', '200');
      const result = await apiFetch<ListUsers>(`/users?${qs.toString()}`);
      const header = ['Name', 'Email', 'Phone', 'Status', 'Joined'];
      const rows = result.items.map((u) =>
        [
          customerName(u),
          u.email,
          u.phone ?? '',
          u.status,
          new Date(u.createdAt).toISOString(),
        ]
          .map((c) => csvCell(String(c)))
          .join(','),
      );
      const csv = [header.map(csvCell).join(','), ...rows].join('\r\n');
      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${result.items.length} customers`, variant: 'success' });
    } catch (e) {
      toast({
        title: 'Export failed',
        description: e instanceof ApiError ? e.message : (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customer accounts and purchase history."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Export CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus /> New customer
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grow min-w-[200px]">
          <Input
            placeholder="Search by name, email or phone"
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
        data={users}
        loading={loading}
        pageSize={PAGE_SIZE}
        hidePagination
        empty={
          <EmptyState
            icon={<Users />}
            title="No customers found"
            description="Try a different search term."
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

      <Dialog open={dialogOpen} onOpenChange={(o) => (!creating ? setDialogOpen(o) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
            <DialogDescription>Create a customer account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password">Password</Label>
              <Input
                id="new-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="new-first">First name</Label>
                <Input
                  id="new-first"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-last">Last name</Label>
                <Input
                  id="new-last"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-phone">Phone</Label>
              <Input
                id="new-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as UserStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={createCustomer}
              disabled={creating || !form.email.trim() || form.password.length < 8}
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : null}
              Create customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
