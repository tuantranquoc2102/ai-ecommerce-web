import { z } from 'zod';

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), schema);

const dateTimeQuery = emptyToUndef(z.string().datetime().optional());

const DateRangeShape = {
  from: dateTimeQuery,
  to: dateTimeQuery,
};

function validateDateRange(
  value: { from?: string; to?: string },
  ctx: z.RefinementCtx,
) {
    if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'from must be less than or equal to to',
      });
    }
}

export const ReportGroupBy = z.enum(['day', 'week', 'month']);
export type ReportGroupBy = z.infer<typeof ReportGroupBy>;

export const RevenueReportQuery = z
  .object({
    ...DateRangeShape,
    groupBy: ReportGroupBy.default('day'),
  })
  .superRefine(validateDateRange);
export type RevenueReportQuery = z.infer<typeof RevenueReportQuery>;

export const CustomerBehaviorReportQuery = z
  .object(DateRangeShape)
  .superRefine(validateDateRange);
export type CustomerBehaviorReportQuery = z.infer<typeof CustomerBehaviorReportQuery>;

export const ProductPerformanceReportQuery = z
  .object({
    ...DateRangeShape,
    limit: z.coerce.number().int().positive().max(100).default(20),
    lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(10),
  })
  .superRefine(validateDateRange);
export type ProductPerformanceReportQuery = z.infer<typeof ProductPerformanceReportQuery>;

export interface ReportRangeView {
  from: string;
  to: string;
}

export interface RevenueSeriesPointView {
  periodStart: string;
  orderCount: number;
  grossRevenue: string;
  refundedRevenue: string;
  netRevenue: string;
}

export interface RevenueReportView {
  range: ReportRangeView & { groupBy: ReportGroupBy };
  summary: {
    orderCount: number;
    grossRevenue: string;
    refundedRevenue: string;
    netRevenue: string;
    averageOrderValue: string;
  };
  series: RevenueSeriesPointView[];
}

export interface CustomerBehaviorTopCustomerView {
  userId: string;
  email: string;
  fullName: string | null;
  orderCount: number;
  totalSpent: string;
  averageOrderValue: string;
  lastOrderAt: string;
}

export interface CustomerBehaviorReportView {
  range: ReportRangeView;
  summary: {
    orderCount: number;
    activeCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    repeatPurchaseRate: number;
    averageOrdersPerCustomer: number;
    guestCheckoutRate: number;
  };
  topCustomers: CustomerBehaviorTopCustomerView[];
}

export interface ProductPerformanceItemView {
  productId: string;
  title: string;
  slug: string;
  mainImage: string | null;
  unitsSold: number;
  orderCount: number;
  grossRevenue: string;
  averageSellingPrice: string;
}

export interface LowStockProductView {
  productId: string;
  title: string;
  slug: string;
  stockQuantity: number;
  reservedStock: number;
  availableStock: number;
}

export interface ProductPerformanceReportView {
  range: ReportRangeView;
  summary: {
    activeProducts: number;
    productsSold: number;
    unitsSold: number;
    grossRevenue: string;
    lowStockCount: number;
  };
  topProducts: ProductPerformanceItemView[];
  lowStockProducts: LowStockProductView[];
  slowMovingProducts: LowStockProductView[];
}
