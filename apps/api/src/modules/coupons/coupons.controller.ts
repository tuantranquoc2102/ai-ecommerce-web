import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CreateCouponDto,
  ListCouponsQuery,
  PERM,
  UpdateCouponDto,
  ValidateCouponDto,
} from '@ecom/shared';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CouponsService } from './coupons.service';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @RequirePermission(PERM.COUPON_READ)
  @Get()
  list(@Query(new ZodValidationPipe(ListCouponsQuery)) query: ListCouponsQuery) {
    return this.coupons.list(query);
  }

  @RequirePermission(PERM.COUPON_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coupons.findById(id);
  }

  @RequirePermission(PERM.COUPON_WRITE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateCouponDto)) body: CreateCouponDto) {
    return this.coupons.create(body);
  }

  @RequirePermission(PERM.COUPON_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCouponDto)) body: UpdateCouponDto,
  ) {
    return this.coupons.update(id, body);
  }

  @RequirePermission(PERM.COUPON_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coupons.delete(id);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  @Post('validate')
  validate(@Body(new ZodValidationPipe(ValidateCouponDto)) body: ValidateCouponDto) {
    return this.coupons.validate(body.code, body.subtotal);
  }
}
