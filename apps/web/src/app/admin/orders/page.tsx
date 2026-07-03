'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ShoppingBag } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ecom/ui';
import type { AdminListOrdersQuery, OrderStatus, OrderView, PaginatedOrders } from '@ecom/shared';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatVnd } from '@/lib/storefront/format';

const STATUS_VARIANT: Record<OrderStatus, 'secondary' | 'success' | 'destructive' | 'outline' | 'default'> = {
  PENDING: 'secondary',
  PAID: 'success',
  PROCESSING: 'default',
  SHIPPING: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  REFUNDED: 'destructive',
  EXPIRED: 'outline',
};

const STATUS_VALUES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'EXPIRED',
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');

  async function load(nextSearch = search, nextStatus = status) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('page', '1');
      qs.set('pageSize', '50');
      if (nextSearch) qs.set('search', nextSearch);
      if (nextStatus !== 'ALL') qs.set('status', nextStatus);
      const result = await apiFetch<PaginatedOrders>(`/orders?${qs.toString()}`);
      setOrders(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('', 'ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo<ColumnDef<OrderView>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: 'Order',
        cell: ({ row }) => (
          <Link
            href={`/admin/orders/${row.original.id}`}
            className="font-mono text-sm font-medium hover:underline"
          >
            {row.original.orderNumber}
          </Link>
        ),
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{row.original.contactEmail ?? '—'}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.userId ? 'Customer' : 'Guest'}
            </div>
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
        id: 'payment',
        header: 'Payment',
        cell: ({ row }) => {
          const p = row.original.payments[0];
          if (!p) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <div className="text-sm">
              <div>{p.provider}</div>
              <div className="text-xs text-muted-foreground">{p.status}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total',
        cell: ({ row }) => <span className="font-medium">{formatVnd(row.original.totalAmount)}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Placed',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? '' : 's'} total.`} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grow min-w-[200px]">
          <Input
            placeholder="Search by order number or customer email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load();
            }}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus | 'ALL')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => load()} disabled={loading}>
          Apply
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="No orders match"
          description="Try clearing filters or waiting for your first order."
        />
      ) : (
        <DataTable columns={columns} data={orders} />
      )}
    </>
  );
}
