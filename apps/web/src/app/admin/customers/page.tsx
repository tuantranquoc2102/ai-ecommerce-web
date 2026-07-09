'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
} from '@ecom/ui';
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
    id: 'roles',
    header: 'Roles',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.userRoles.length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          row.original.userRoles.map(({ role }) => (
            <Badge key={role.id} variant="secondary" className="text-xs">
              {role.name}
            </Badge>
          ))
        )}
      </div>
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

export default function CustomersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('pageSize', String(PAGE_SIZE));
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Customers" description="Manage customer accounts and purchase history." />

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
        <Button onClick={applySearch} disabled={loading}>
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
    </>
  );
}
