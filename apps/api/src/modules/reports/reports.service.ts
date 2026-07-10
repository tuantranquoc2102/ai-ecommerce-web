import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CustomerBehaviorReportQuery,
  CustomerBehaviorReportView,
  CustomerBehaviorTopCustomerView,
  ProductPerformanceItemView,
  ProductPerformanceReportQuery,
  ProductPerformanceReportView,
  RevenueReportQuery,
  RevenueReportView,
  RevenueSeriesPointView,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

type DecimalLike = Prisma.Decimal | string | number | null;

type RevenueSeriesRow = {
  periodStart: Date;
  orderCount: number | bigint | string;
  grossRevenue: DecimalLike;
  refundedRevenue: DecimalLike;
};

type OrderCountRow = {
  orderCount: number;
  guestOrderCount: number;
};

type CustomerBehaviorRow = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  firstOrderAt: Date;
  lastOrderAt: Date;
  orderCount: number | bigint | string;
  totalSpent: DecimalLike;
};

type ProductPerformanceRow = {
  productId: string;
  orderCount: number | bigint | string;
  unitsSold: number | bigint | string;
  grossRevenue: DecimalLike;
};

type TotalsRow = {
  unitsSold: number | bigint | string;
  grossRevenue: DecimalLike;
};

type CountRow = {
  count: number;
};

type LowStockRow = {
  productId: string;
  title: string;
  slug: string;
  stockQuantity: number;
  reservedStock: number;
  availableStock: number;
};

const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPING', 'COMPLETED', 'REFUNDED'] as const;
const REFUNDED_STATUS = 'REFUNDED' as const;
const DAY_MS = 24 * 60 * 60 * 1000;

function orderStatusListSql(statuses: readonly string[]): Prisma.Sql {
  return Prisma.join(statuses.map((s) => Prisma.sql`${s}::"OrderStatus"`));
}

const REVENUE_STATUS_LIST_SQL = orderStatusListSql(REVENUE_STATUSES);
const REFUNDED_STATUS_SQL = Prisma.sql`${REFUNDED_STATUS}::"OrderStatus"`;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenue(query: RevenueReportQuery): Promise<RevenueReportView> {
    const range = this.resolveRange(query.from, query.to);
    const truncExpr = this.dateTruncExpr(query.groupBy);

    const rows = await this.prisma.$queryRaw<RevenueSeriesRow[]>(Prisma.sql`
      SELECT
        ${truncExpr} AS "periodStart",
        COUNT(*)::int AS "orderCount",
        COALESCE(SUM("totalAmount"), 0) AS "grossRevenue",
        COALESCE(
          SUM(
            CASE
              WHEN "status" = ${REFUNDED_STATUS_SQL}
                THEN COALESCE("refundedAmount", "totalAmount")
              ELSE 0
            END
          ),
          0
        ) AS "refundedRevenue"
      FROM "Order"
      WHERE "status" IN (${REVENUE_STATUS_LIST_SQL})
        AND "createdAt" >= ${range.from}
        AND "createdAt" <= ${range.to}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    const series: RevenueSeriesPointView[] = rows.map((row) => {
      const grossRevenue = toAmount(row.grossRevenue);
      const refundedRevenue = toAmount(row.refundedRevenue);
      const netRevenue = toAmount(toNumber(grossRevenue) - toNumber(refundedRevenue));

      return {
        periodStart: row.periodStart.toISOString(),
        orderCount: toInt(row.orderCount),
        grossRevenue,
        refundedRevenue,
        netRevenue,
      };
    });

    const summary = series.reduce(
      (acc, item) => {
        acc.orderCount += item.orderCount;
        acc.grossRevenue += toNumber(item.grossRevenue);
        acc.refundedRevenue += toNumber(item.refundedRevenue);
        return acc;
      },
      { orderCount: 0, grossRevenue: 0, refundedRevenue: 0 },
    );

    const netRevenue = summary.grossRevenue - summary.refundedRevenue;

    return {
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        groupBy: query.groupBy,
      },
      summary: {
        orderCount: summary.orderCount,
        grossRevenue: toAmount(summary.grossRevenue),
        refundedRevenue: toAmount(summary.refundedRevenue),
        netRevenue: toAmount(netRevenue),
        averageOrderValue:
          summary.orderCount > 0 ? toAmount(netRevenue / summary.orderCount) : toAmount(0),
      },
      series,
    };
  }

  async customerBehavior(
    query: CustomerBehaviorReportQuery,
  ): Promise<CustomerBehaviorReportView> {
    const range = this.resolveRange(query.from, query.to);
    const [counts, byUser] = await this.prisma.$transaction([
      this.prisma.$queryRaw<OrderCountRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::int AS "orderCount",
          COUNT(*) FILTER (WHERE "userId" IS NULL)::int AS "guestOrderCount"
        FROM "Order"
        WHERE "status" IN (${REVENUE_STATUS_LIST_SQL})
          AND "createdAt" >= ${range.from}
          AND "createdAt" <= ${range.to}
      `),
      this.prisma.$queryRaw<CustomerBehaviorRow[]>(Prisma.sql`
        SELECT
          o."userId" AS "userId",
          u."email" AS "email",
          u."firstName" AS "firstName",
          u."lastName" AS "lastName",
          firsts."firstOrderAt" AS "firstOrderAt",
          MAX(o."createdAt") AS "lastOrderAt",
          COUNT(*)::int AS "orderCount",
          COALESCE(SUM(o."totalAmount"), 0) AS "totalSpent"
        FROM "Order" o
        JOIN "User" u ON u."id" = o."userId"
        JOIN (
          SELECT "userId", MIN("createdAt") AS "firstOrderAt"
          FROM "Order"
          WHERE "status" IN (${REVENUE_STATUS_LIST_SQL})
            AND "userId" IS NOT NULL
          GROUP BY "userId"
        ) firsts ON firsts."userId" = o."userId"
        WHERE o."status" IN (${REVENUE_STATUS_LIST_SQL})
          AND o."createdAt" >= ${range.from}
          AND o."createdAt" <= ${range.to}
          AND o."userId" IS NOT NULL
        GROUP BY o."userId", u."email", u."firstName", u."lastName", firsts."firstOrderAt"
        ORDER BY "totalSpent" DESC
      `),
    ]);

    const topCustomers: CustomerBehaviorTopCustomerView[] = byUser.slice(0, 20).map((item) => {
      const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ').trim();
      const orderCountByUser = toInt(item.orderCount);
      const totalSpent = toAmount(item.totalSpent);
      return {
        userId: item.userId,
        email: item.email,
        fullName: fullName || null,
        orderCount: orderCountByUser,
        totalSpent,
        averageOrderValue:
          orderCountByUser > 0 ? toAmount(toNumber(totalSpent) / orderCountByUser) : toAmount(0),
        lastOrderAt: item.lastOrderAt.toISOString(),
      };
    });

    const orderCount = counts[0]?.orderCount ?? 0;
    const guestOrderCount = counts[0]?.guestOrderCount ?? 0;
    const activeCustomers = byUser.length;
    const newCustomers = byUser.reduce((count, item) => {
      return item.firstOrderAt >= range.from && item.firstOrderAt <= range.to ? count + 1 : count;
    }, 0);
    const returningCustomers = Math.max(activeCustomers - newCustomers, 0);
    const repeatCustomers = byUser.filter((item) => toInt(item.orderCount) >= 2).length;

    return {
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      summary: {
        orderCount,
        activeCustomers,
        newCustomers,
        returningCustomers,
        repeatPurchaseRate:
          activeCustomers > 0 ? round2((repeatCustomers / activeCustomers) * 100) : 0,
        averageOrdersPerCustomer:
          activeCustomers > 0 ? round2(orderCount / activeCustomers) : 0,
        guestCheckoutRate: orderCount > 0 ? round2((guestOrderCount / orderCount) * 100) : 0,
      },
      topCustomers,
    };
  }

  async productPerformance(
    query: ProductPerformanceReportQuery,
  ): Promise<ProductPerformanceReportView> {
    const range = this.resolveRange(query.from, query.to);
    const [activeProducts, totalsRow, topRows, productsSoldRow, lowStockCountRow, lowStockRows] =
      await this.prisma.$transaction([
        this.prisma.product.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
        this.prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
          SELECT
            COALESCE(SUM(oi."quantity"), 0)::int AS "unitsSold",
            COALESCE(SUM(oi."lineTotal"), 0) AS "grossRevenue"
          FROM "OrderItem" oi
          JOIN "Order" o ON o."id" = oi."orderId"
          WHERE o."status" IN (${REVENUE_STATUS_LIST_SQL})
            AND o."createdAt" >= ${range.from}
            AND o."createdAt" <= ${range.to}
        `),
        this.prisma.$queryRaw<ProductPerformanceRow[]>(Prisma.sql`
          SELECT
            oi."productId" AS "productId",
            COUNT(*)::int AS "orderCount",
            COALESCE(SUM(oi."quantity"), 0)::int AS "unitsSold",
            COALESCE(SUM(oi."lineTotal"), 0) AS "grossRevenue"
          FROM "OrderItem" oi
          JOIN "Order" o ON o."id" = oi."orderId"
          WHERE o."status" IN (${REVENUE_STATUS_LIST_SQL})
            AND o."createdAt" >= ${range.from}
            AND o."createdAt" <= ${range.to}
          GROUP BY oi."productId"
          ORDER BY "grossRevenue" DESC
          LIMIT ${query.limit}
        `),
        this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(DISTINCT oi."productId")::int AS "count"
          FROM "OrderItem" oi
          JOIN "Order" o ON o."id" = oi."orderId"
          WHERE o."status" IN (${REVENUE_STATUS_LIST_SQL})
            AND o."createdAt" >= ${range.from}
            AND o."createdAt" <= ${range.to}
        `),
        this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*)::int AS "count"
          FROM "Product"
          WHERE "deletedAt" IS NULL
            AND "status" = 'ACTIVE'
            AND "type" = 'PHYSICAL'
            AND ("stockQuantity" - "reservedStock") <= ${query.lowStockThreshold}
        `),
        this.prisma.$queryRaw<LowStockRow[]>(Prisma.sql`
          SELECT
            "id" AS "productId",
            "title",
            "slug",
            "stockQuantity",
            "reservedStock",
            ("stockQuantity" - "reservedStock")::int AS "availableStock"
          FROM "Product"
          WHERE "deletedAt" IS NULL
            AND "status" = 'ACTIVE'
            AND "type" = 'PHYSICAL'
            AND ("stockQuantity" - "reservedStock") <= ${query.lowStockThreshold}
          ORDER BY "availableStock" ASC, "updatedAt" DESC
          LIMIT ${query.limit}
        `),
      ]);

    const topProductIds = topRows.map((row) => row.productId);
    const products = topProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, title: true, slug: true, mainImage: true },
        })
      : [];
    const productMap = new Map(products.map((item) => [item.id, item]));

    const topProducts: ProductPerformanceItemView[] = topRows
      .map((row) => {
        const product = productMap.get(row.productId);
        if (!product) return null;

        const unitsSold = toInt(row.unitsSold);
        const grossRevenue = toAmount(row.grossRevenue);

        return {
          productId: row.productId,
          title: product.title,
          slug: product.slug,
          mainImage: product.mainImage,
          unitsSold,
          orderCount: toInt(row.orderCount),
          grossRevenue,
          averageSellingPrice: unitsSold > 0 ? toAmount(toNumber(grossRevenue) / unitsSold) : toAmount(0),
        };
      })
      .filter((item): item is ProductPerformanceItemView => item !== null);

    const slowMovingRows = await this.prisma.$queryRaw<LowStockRow[]>(Prisma.sql`
      SELECT
        p."id" AS "productId",
        p."title" AS "title",
        p."slug" AS "slug",
        p."stockQuantity" AS "stockQuantity",
        p."reservedStock" AS "reservedStock",
        (p."stockQuantity" - p."reservedStock")::int AS "availableStock"
      FROM "Product" p
      WHERE p."deletedAt" IS NULL
        AND p."status" = 'ACTIVE'
        AND p."stockQuantity" > 0
        AND NOT EXISTS (
          SELECT 1
          FROM "OrderItem" oi
          JOIN "Order" o ON o."id" = oi."orderId"
          WHERE oi."productId" = p."id"
            AND o."status" IN (${REVENUE_STATUS_LIST_SQL})
            AND o."createdAt" >= ${range.from}
            AND o."createdAt" <= ${range.to}
        )
      ORDER BY p."updatedAt" ASC, p."createdAt" ASC
      LIMIT ${query.limit}
    `);

    return {
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      summary: {
        activeProducts,
        productsSold: productsSoldRow[0]?.count ?? 0,
        unitsSold: toInt(totalsRow[0]?.unitsSold ?? 0),
        grossRevenue: toAmount(totalsRow[0]?.grossRevenue ?? 0),
        lowStockCount: lowStockCountRow[0]?.count ?? 0,
      },
      topProducts,
      lowStockProducts: lowStockRows,
      slowMovingProducts: slowMovingRows,
    };
  }

  private resolveRange(from?: string, to?: string): { from: Date; to: Date } {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - 30 * DAY_MS);
    return { from: start, to: end };
  }

  private dateTruncExpr(groupBy: RevenueReportQuery['groupBy']): Prisma.Sql {
    if (groupBy === 'week') return Prisma.sql`date_trunc('week', "createdAt")`;
    if (groupBy === 'month') return Prisma.sql`date_trunc('month', "createdAt")`;
    return Prisma.sql`date_trunc('day', "createdAt")`;
  }
}

function toAmount(value: DecimalLike): string {
  if (value == null) return '0';
  if (value instanceof Prisma.Decimal) return value.toString();
  return Number(value).toFixed(2);
}

function toNumber(value: DecimalLike): number {
  if (value == null) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}

function toInt(value: number | bigint | string): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value);
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
