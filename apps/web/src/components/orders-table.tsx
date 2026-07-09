'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ecom/ui';
import type { OrderStatus, OrderView, PaginatedOrders, PaymentProvider } from '@ecom/shared';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatVnd } from '@/lib/storefront/format';

export const ORDER_STATUS_VARIANT: Record<
  OrderStatus,
  'secondary' | 'success' | 'destructive' | 'outline' | 'default'
> = {
  PENDING: 'secondary',
  PAID: 'success',
  PROCESSING: 'default',
  SHIPPING: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  REFUNDED: 'destructive',
  EXPIRED: 'outline',
};

export const ORDER_STATUS_VALUES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'EXPIRED',
];

const PAYMENT_PROVIDERS: PaymentProvider[] = ['MOMO', 'VNPAY', 'CREDIT_CARD', 'COD'];

type SortBy = 'createdAt' | 'totalAmount';
type SortDir = 'asc' | 'desc';

export interface OrdersTableProps {
  /** Fixed, non-editable filters merged into every request. */
  baseFilters?: { status?: OrderStatus; userId?: string; paymentProvider?: PaymentProvider };
  /**
   * Multi-status mode: fetch each status and merge client-side (used for the
   * returns/cancellations screen where the single-valued API status filter is
   * insufficient). When set, in-table pagination is applied over the merged set.
   */
  statuses?: OrderStatus[];
  pageSize?: number;
  showSearch?: boolean;
  showStatusFilter?: boolean;
  showPaymentFilter?: boolean;
  showDateFilter?: boolean;
  showSort?: boolean;
}

const orderColumns: ColumnDef<OrderView>[] = [
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
      <Badge variant={ORDER_STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>
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
];

/**
 * Reusable admin orders list: fetches `GET /orders` with the given filters and
 * renders a DataTable + server-driven pagination. Handles loading / empty /
 * error states.
 */
export function OrdersTable({
  baseFilters,
  statuses,
  pageSize = 20,
  showSearch = true,
  showStatusFilter = false,
  showPaymentFilter = false,
  showDateFilter = false,
  showSort = false,
}: OrdersTableProps) {
  // Primitive extraction so effect deps stay stable across renders (callers
  // pass inline object/array props).
  const baseStatus = baseFilters?.status;
  const baseUserId = baseFilters?.userId;
  const baseProvider = baseFilters?.paymentProvider;
  const statusesKey = (statuses ?? []).join(',');
  const isMulti = (statuses ?? []).length > 0;

  const [allItems, setAllItems] = useState<OrderView[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Editable controls (drafts) + committed values that trigger a refetch.
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [committedFrom, setCommittedFrom] = useState('');
  const [committedTo, setCommittedTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<PaymentProvider | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const buildQuery = useCallback(
    (statusOverride?: OrderStatus): URLSearchParams => {
      const qs = new URLSearchParams();
      qs.set('page', String(isMulti ? 1 : page));
      qs.set('pageSize', String(isMulti ? 200 : pageSize));
      if (committedSearch) qs.set('search', committedSearch);

      const effectiveStatus =
        statusOverride ?? baseStatus ?? (statusFilter !== 'ALL' ? statusFilter : undefined);
      if (effectiveStatus) qs.set('status', effectiveStatus);

      const effectiveProvider =
        baseProvider ?? (paymentFilter !== 'ALL' ? paymentFilter : undefined);
      if (effectiveProvider) qs.set('paymentProvider', effectiveProvider);

      if (baseUserId) qs.set('userId', baseUserId);

      if (committedFrom) {
        const d = new Date(committedFrom);
        if (!Number.isNaN(d.getTime())) qs.set('from', d.toISOString());
      }
      if (committedTo) {
        const d = new Date(committedTo);
        if (!Number.isNaN(d.getTime())) qs.set('to', d.toISOString());
      }
      qs.set('sortBy', sortBy);
      qs.set('sortDir', sortDir);
      return qs;
    },
    [
      isMulti,
      page,
      pageSize,
      committedSearch,
      baseStatus,
      statusFilter,
      baseProvider,
      paymentFilter,
      baseUserId,
      committedFrom,
      committedTo,
      sortBy,
      sortDir,
    ],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isMulti) {
        const list = statusesKey.split(',').filter(Boolean) as OrderStatus[];
        const results = await Promise.all(
          list.map((s) => apiFetch<PaginatedOrders>(`/orders?${buildQuery(s).toString()}`)),
        );
        const merged = results
          .flatMap((r) => r.items)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllItems(merged);
        setServerTotal(merged.length);
      } else {
        const result = await apiFetch<PaginatedOrders>(`/orders?${buildQuery().toString()}`);
        setAllItems(result.items);
        setServerTotal(result.total);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
      setAllItems([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
    // statusesKey drives the multi-mode fetch set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMulti, statusesKey, buildQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const total = serverTotal;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const displayItems = useMemo(
    () => (isMulti ? allItems.slice((page - 1) * pageSize, page * pageSize) : allItems),
    [isMulti, allItems, page, pageSize],
  );

  function applyFilters() {
    setCommittedSearch(search.trim());
    setCommittedFrom(from);
    setCommittedTo(to);
    setPage(1);
  }

  const hasControls = showSearch || showStatusFilter || showPaymentFilter || showDateFilter || showSort;

  return (
    <div className="space-y-4">
      {hasControls ? (
        <div className="flex flex-wrap items-end gap-3">
          {showSearch ? (
            <div className="grow min-w-[200px]">
              <Input
                placeholder="Search by order number or customer email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters();
                }}
              />
            </div>
          ) : null}

          {showStatusFilter ? (
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as OrderStatus | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {ORDER_STATUS_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {showPaymentFilter ? (
            <Select
              value={paymentFilter}
              onValueChange={(v) => {
                setPaymentFilter(v as PaymentProvider | 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Any payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All payments</SelectItem>
                {PAYMENT_PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {showDateFilter ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="orders-from" className="text-xs">
                  From
                </Label>
                <Input
                  id="orders-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-[160px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="orders-to" className="text-xs">
                  To
                </Label>
                <Input
                  id="orders-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-[160px]"
                />
              </div>
            </>
          ) : null}

          {showSort ? (
            <>
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  setSortBy(v as SortBy);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Placed date</SelectItem>
                  <SelectItem value="totalAmount">Total</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortDir}
                onValueChange={(v) => {
                  setSortDir(v as SortDir);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : null}

          {showSearch || showDateFilter ? (
            <Button onClick={applyFilters} disabled={loading}>
              Apply
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        columns={orderColumns}
        data={displayItems}
        loading={loading}
        pageSize={pageSize}
        hidePagination
        empty={
          <EmptyState
            icon={<ShoppingBag />}
            title="No orders match"
            description="Try clearing filters or waiting for your first order."
          />
        }
      />

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
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
    </div>
  );
}
