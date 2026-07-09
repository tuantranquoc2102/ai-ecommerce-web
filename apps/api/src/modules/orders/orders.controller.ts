import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  AdminListOrdersQuery,
  CreateOrderDto,
  MyOrdersQuery,
  PERM,
  RefundOrderDto,
  UpdateOrderStatusDto,
  UpdateShippingDto,
} from '@ecom/shared';
import { OptionalAuth } from '../../common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Storefront checkout — guest or authenticated. When a Bearer token is
   * present the order is linked to that user; otherwise `contactEmail` is
   * required on the DTO. Returns the order number, an optional guest token
   * (for the confirmation URL), and an optional gateway redirect URL.
   */
  @OptionalAuth()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('checkout')
  async checkout(
    @Body(new ZodValidationPipe(CreateOrderDto)) body: CreateOrderDto,
    @CurrentUser() maybeUser: RequestUser | undefined,
  ) {
    let user: { id: string; email: string } | null = null;
    if (maybeUser?.id) {
      const record = await this.prisma.user.findUnique({
        where: { id: maybeUser.id },
        select: { id: true, email: true },
      });
      if (record) user = record;
    }
    return this.orders.createDraft(body, user);
  }

  /**
   * Guest-friendly order lookup used by the confirmation page. Requires a
   * short-lived token (issued at checkout, TTL 24h in Redis).
   */
  @OptionalAuth()
  @Get('by-number/:orderNumber')
  async byNumber(
    @Param('orderNumber') orderNumber: string,
    @Query('token') token: string | undefined,
    @CurrentUser() user: RequestUser | undefined,
  ) {
    if (user?.id) {
      // Authenticated fast path — allow lookup without a token if they own it.
      try {
        return await this.orders.findMineByNumber(user.id, orderNumber);
      } catch {
        // Fall through to the token check if the order isn't theirs.
      }
    }
    if (!token) {
      throw new BadRequestException({
        code: 'ORDER_TOKEN_REQUIRED',
        message: 'Order token or authentication required',
      });
    }
    return this.orders.findByNumberForGuest(orderNumber, token);
  }

  @Get('me')
  listMine(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(MyOrdersQuery)) query: MyOrdersQuery,
  ) {
    return this.orders.findMyOrders(user.id, query);
  }

  @Get('me/:orderNumber')
  findMineByNumber(
    @CurrentUser() user: RequestUser,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.orders.findMineByNumber(user.id, orderNumber);
  }

  @RequirePermission(PERM.ORDER_READ)
  @Get()
  list(@Query(new ZodValidationPipe(AdminListOrdersQuery)) query: AdminListOrdersQuery) {
    return this.orders.listAdmin(query);
  }

  @RequirePermission(PERM.ORDER_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  @RequirePermission(PERM.ORDER_UPDATE)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOrderStatusDto)) body: UpdateOrderStatusDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.orders.transitionStatus(id, body, user?.id);
  }

  /**
   * Records a refund against a paid order. Does NOT call back to the payment
   * gateway to reverse funds — admins process the money movement out-of-band
   * and use this to keep the ledger, stock, and audit trail consistent.
   */
  @RequirePermission(PERM.ORDER_REFUND)
  @Post(':id/refund')
  refund(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RefundOrderDto)) body: RefundOrderDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.orders.refund(id, body, user?.id);
  }

  /**
   * Standalone edit of an order's shipping info without a status change.
   */
  @RequirePermission(PERM.ORDER_UPDATE)
  @Patch(':id/shipping')
  updateShipping(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateShippingDto)) body: UpdateShippingDto,
  ) {
    return this.orders.updateShipping(id, body);
  }
}
