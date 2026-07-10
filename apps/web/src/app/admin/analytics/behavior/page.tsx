'use client';

import { useEffect, useMemo, useState } from 'react';
import { UsersRound } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { CustomerBehaviorReportView, CustomerBehaviorTopCustomerView } from '@ecom/shared';
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ecom/ui';
import { ApiError, apiFetch } from '@/lib/api-client';

type RangePreset = '7' | '30' | '90';

const NUMBER = new Intl.NumberFormat('vi-VN');
const CURRENCY = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export default function BehaviorAnalyticsPage() {
  const [preset, setPreset] = useState<RangePreset>('30');
  const [report, setReport] = useState<CustomerBehaviorReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<CustomerBehaviorTopCustomerView>[]>(
    () => [
      {
        accessorKey: 'email',
        header: 'Khách hàng',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.fullName ?? row.original.email}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'orderCount',
        header: 'Số đơn',
        cell: ({ row }) => NUMBER.format(row.original.orderCount),
      },
      {
        accessorKey: 'totalSpent',
        header: 'Tổng chi tiêu',
        cell: ({ row }) => CURRENCY.format(Number(row.original.totalSpent)),
      },
      {
        accessorKey: 'averageOrderValue',
        header: 'AOV',
        cell: ({ row }) => CURRENCY.format(Number(row.original.averageOrderValue)),
      },
      {
        accessorKey: 'lastOrderAt',
        header: 'Đơn gần nhất',
        cell: ({ row }) => new Date(row.original.lastOrderAt).toLocaleDateString('vi-VN'),
      },
    ],
    [],
  );

  useEffect(() => {
    void loadBehaviorReport(preset, setReport, setErr, setLoading);
  }, [preset]);

  return (
    <>
      <PageHeader
        title="Hành vi khách hàng"
        description="Theo dõi khách mới, khách quay lại và nhóm khách hàng giá trị cao."
        actions={
          <Select value={preset} onValueChange={(value) => setPreset(value as RangePreset)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày gần đây</SelectItem>
              <SelectItem value="30">30 ngày gần đây</SelectItem>
              <SelectItem value="90">90 ngày gần đây</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {err ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Khách hoạt động"
          description="Có phát sinh đơn trong kỳ"
          value={NUMBER.format(report?.summary.activeCustomers ?? 0)}
        />
        <MetricCard
          title="Khách mới"
          description="Lần đầu mua hàng trong kỳ"
          value={NUMBER.format(report?.summary.newCustomers ?? 0)}
        />
        <MetricCard
          title="Tỷ lệ mua lặp lại"
          description="Khách có >= 2 đơn trong kỳ"
          value={`${NUMBER.format(report?.summary.repeatPurchaseRate ?? 0)}%`}
        />
        <MetricCard
          title="Tỷ lệ checkout guest"
          description="Đơn hàng không gắn tài khoản"
          value={`${NUMBER.format(report?.summary.guestCheckoutRate ?? 0)}%`}
        />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={report?.topCustomers ?? []}
          loading={loading}
          searchColumn="email"
          searchPlaceholder="Tìm theo email khách hàng..."
          empty={
            <EmptyState
              icon={<UsersRound />}
              title="Chưa có dữ liệu khách hàng"
              description="Hệ thống chưa ghi nhận khách mua hàng trong khoảng thời gian này."
            />
          }
        />
      </div>
    </>
  );
}

function MetricCard({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">{description}</CardContent>
    </Card>
  );
}

async function loadBehaviorReport(
  preset: RangePreset,
  setReport: (value: CustomerBehaviorReportView | null) => void,
  setErr: (value: string | null) => void,
  setLoading: (value: boolean) => void,
) {
  setLoading(true);
  setErr(null);
  try {
    const from = new Date(Date.now() - Number(preset) * 24 * 60 * 60 * 1000).toISOString();
    const data = await apiFetch<CustomerBehaviorReportView>(
      `/reports/customer-behavior?from=${encodeURIComponent(from)}`,
    );
    setReport(data);
  } catch (e) {
    setErr(e instanceof ApiError ? e.message : (e as Error).message);
    setReport(null);
  } finally {
    setLoading(false);
  }
}
