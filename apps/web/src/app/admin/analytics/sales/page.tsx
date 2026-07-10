'use client';

import { useEffect, useMemo, useState } from 'react';
import { LineChart } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReportGroupBy, RevenueReportView, RevenueSeriesPointView } from '@ecom/shared';
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

const CURRENCY = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat('vi-VN');

export default function SalesReportPage() {
  const [preset, setPreset] = useState<RangePreset>('30');
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('day');
  const [report, setReport] = useState<RevenueReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<RevenueSeriesPointView>[]>(
    () => [
      {
        accessorKey: 'periodStart',
        header: 'Mốc thời gian',
        cell: ({ row }) => formatPeriod(row.original.periodStart, groupBy),
      },
      {
        accessorKey: 'orderCount',
        header: 'Số đơn',
        cell: ({ row }) => NUMBER.format(row.original.orderCount),
      },
      {
        accessorKey: 'grossRevenue',
        header: 'Doanh thu gộp',
        cell: ({ row }) => CURRENCY.format(Number(row.original.grossRevenue)),
      },
      {
        accessorKey: 'refundedRevenue',
        header: 'Hoàn tiền',
        cell: ({ row }) => CURRENCY.format(Number(row.original.refundedRevenue)),
      },
      {
        accessorKey: 'netRevenue',
        header: 'Doanh thu thuần',
        cell: ({ row }) => CURRENCY.format(Number(row.original.netRevenue)),
      },
    ],
    [groupBy],
  );

  useEffect(() => {
    void loadRevenueReport(preset, groupBy, setReport, setErr, setLoading);
  }, [preset, groupBy]);

  return (
    <>
      <PageHeader
        title="Báo cáo doanh thu"
        description="Theo dõi doanh thu gộp, hoàn tiền và doanh thu thuần theo thời gian."
        actions={
          <div className="flex items-center gap-2">
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

            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as ReportGroupBy)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Nhóm theo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Ngày</SelectItem>
                <SelectItem value="week">Tuần</SelectItem>
                <SelectItem value="month">Tháng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {err ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Tổng đơn doanh thu"
          description="Đơn ở trạng thái ghi nhận doanh thu"
          value={NUMBER.format(report?.summary.orderCount ?? 0)}
        />
        <MetricCard
          title="Doanh thu gộp"
          description="Trước khi trừ hoàn tiền"
          value={CURRENCY.format(Number(report?.summary.grossRevenue ?? 0))}
        />
        <MetricCard
          title="Doanh thu thuần"
          description="Sau khi trừ hoàn tiền"
          value={CURRENCY.format(Number(report?.summary.netRevenue ?? 0))}
        />
        <MetricCard
          title="Giá trị đơn trung bình"
          description="Net revenue / số đơn"
          value={CURRENCY.format(Number(report?.summary.averageOrderValue ?? 0))}
        />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={report?.series ?? []}
          loading={loading}
          searchColumn="periodStart"
          searchPlaceholder="Lọc theo mốc thời gian..."
          empty={
            <EmptyState
              icon={<LineChart />}
              title="Chưa có dữ liệu doanh thu"
              description="Thử mở rộng khoảng thời gian để xem thêm dữ liệu."
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

async function loadRevenueReport(
  preset: RangePreset,
  groupBy: ReportGroupBy,
  setReport: (value: RevenueReportView | null) => void,
  setErr: (value: string | null) => void,
  setLoading: (value: boolean) => void,
) {
  setLoading(true);
  setErr(null);
  try {
    const from = new Date(Date.now() - Number(preset) * 24 * 60 * 60 * 1000).toISOString();
    const data = await apiFetch<RevenueReportView>(
      `/reports/revenue?from=${encodeURIComponent(from)}&groupBy=${groupBy}`,
    );
    setReport(data);
  } catch (e) {
    setErr(e instanceof ApiError ? e.message : (e as Error).message);
    setReport(null);
  } finally {
    setLoading(false);
  }
}

function formatPeriod(value: string, groupBy: ReportGroupBy): string {
  const date = new Date(value);
  if (groupBy === 'month') {
    return date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
  }
  return date.toLocaleDateString('vi-VN');
}
