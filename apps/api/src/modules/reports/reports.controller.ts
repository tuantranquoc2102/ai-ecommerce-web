import { Controller, Get, Query } from '@nestjs/common';
import {
  CustomerBehaviorReportQuery,
  PERM,
  ProductPerformanceReportQuery,
  RevenueReportQuery,
} from '@ecom/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReportsService } from './reports.service';

@Controller('reports')
@RequirePermission(PERM.ORDER_READ)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  revenue(@Query(new ZodValidationPipe(RevenueReportQuery)) query: RevenueReportQuery) {
    return this.reports.revenue(query);
  }

  @Get('customer-behavior')
  customerBehavior(
    @Query(new ZodValidationPipe(CustomerBehaviorReportQuery)) query: CustomerBehaviorReportQuery,
  ) {
    return this.reports.customerBehavior(query);
  }

  @Get('product-performance')
  productPerformance(
    @Query(new ZodValidationPipe(ProductPerformanceReportQuery)) query: ProductPerformanceReportQuery,
  ) {
    return this.reports.productPerformance(query);
  }
}
