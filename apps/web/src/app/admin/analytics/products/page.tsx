'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Boxes } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  LowStockProductView,
  ProductPerformanceItemView,
  ProductPerformanceReportView,
} from '@ecom/shared';
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

export default function ProductPerformancePage() {
  const [preset, setPreset] = useState<RangePreset>('30');
  const [report, setReport] = useState<ProductPerformanceReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const topColumns = useMemo<ColumnDef<ProductPerformanceItemView>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Sản phẩm',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">/{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: 'unitsSold',
        header: 'Đã bán',
        cell: ({ row }) => NUMBER.format(row.original.unitsSold),
      },
      {
        accessorKey: 'orderCount',
        header: 'Số đơn',
        cell: ({ row }) => NUMBER.format(row.original.orderCount),
      },
      {
        accessorKey: 'averageSellingPrice',
        header: 'Giá bán TB',
        cell: ({ row }) => CURRENCY.format(Number(row.original.averageSellingPrice)),
      },
      {
        accessorKey: 'grossRevenue',
        header: 'Doanh thu',
        cell: ({ row }) => CURRENCY.format(Number(row.original.grossRevenue)),
      },
    ],
    [],
  );

  const stockColumns = useMemo<ColumnDef<LowStockProductView>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Sản phẩm',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">/{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: 'stockQuantity',
        header: 'Tồn kho',
        cell: ({ row }) => NUMBER.format(row.original.stockQuantity),
      },
      {
        accessorKey: 'reservedStock',
        header: 'Đang giữ',
        cell: ({ row }) => NUMBER.format(row.original.reservedStock),
      },
      {
        accessorKey: 'availableStock',
        header: 'Khả dụng',
        cell: ({ row }) => NUMBER.format(row.original.availableStock),
      },
    ],
    [],
  );

  useEffect(() => {
    void loadProductPerformance(preset, setReport, setErr, setLoading);
  }, [preset]);

  return (
    <>
      <PageHeader
        title="Hiệu suất sản phẩm"
        description="Đánh giá nhóm sản phẩm bán tốt, chậm bán và tồn kho thấp."
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Sản phẩm active"
          description="Sản phẩm đang mở bán"
          value={NUMBER.format(report?.summary.activeProducts ?? 0)}
        />
        <MetricCard
          title="Sản phẩm có bán"
          description="Có đơn trong kỳ"
          value={NUMBER.format(report?.summary.productsSold ?? 0)}
        />
        <MetricCard
          title="Số lượng đã bán"
          description="Tổng units sold"
          value={NUMBER.format(report?.summary.unitsSold ?? 0)}
        />
        <MetricCard
          title="Doanh thu sản phẩm"
          description="Theo order item trong kỳ"
          value={CURRENCY.format(Number(report?.summary.grossRevenue ?? 0))}
        />
        <MetricCard
          title="Tồn kho thấp"
          description="Cần ưu tiên nhập thêm"
          value={NUMBER.format(report?.summary.lowStockCount ?? 0)}
        />
      </div>

      <div className="mt-6 space-y-6">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Top sản phẩm theo doanh thu</h2>
          <DataTable
            columns={topColumns}
            data={report?.topProducts ?? []}
            loading={loading}
            searchColumn="title"
            searchPlaceholder="Tìm theo tên sản phẩm..."
            empty={
              <EmptyState
                icon={<BarChart3 />}
                title="Chưa có dữ liệu bán hàng"
                description="Khoảng thời gian này chưa có sản phẩm phát sinh doanh thu."
              />
            }
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sản phẩm tồn kho thấp</h2>
          <DataTable
            columns={stockColumns}
            data={report?.lowStockProducts ?? []}
            loading={loading}
            searchColumn="title"
            searchPlaceholder="Tìm sản phẩm tồn kho thấp..."
            empty={
              <EmptyState
                icon={<Boxes />}
                title="Không có cảnh báo tồn kho thấp"
                description="Tất cả sản phẩm physical đang có mức tồn kho khả dụng tốt."
              />
            }
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Sản phẩm chậm bán</h2>
          <DataTable
            columns={stockColumns}
            data={report?.slowMovingProducts ?? []}
            loading={loading}
            searchColumn="title"
            searchPlaceholder="Tìm sản phẩm chậm bán..."
            empty={
              <EmptyState
                icon={<Boxes />}
                title="Không có sản phẩm chậm bán"
                description="Tất cả sản phẩm active đều có phát sinh đơn trong kỳ."
              />
            }
          />
        </section>
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

async function loadProductPerformance(
  preset: RangePreset,
  setReport: (value: ProductPerformanceReportView | null) => void,
  setErr: (value: string | null) => void,
  setLoading: (value: boolean) => void,
) {
  setLoading(true);
  setErr(null);
  try {
    const from = new Date(Date.now() - Number(preset) * 24 * 60 * 60 * 1000).toISOString();
    const data = await apiFetch<ProductPerformanceReportView>(
      `/reports/product-performance?from=${encodeURIComponent(from)}&limit=20&lowStockThreshold=10`,
    );
    setReport(data);
  } catch (e) {
    setErr(e instanceof ApiError ? e.message : (e as Error).message);
    setReport(null);
  } finally {
    setLoading(false);
  }
}
