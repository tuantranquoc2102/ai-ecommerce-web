import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ValidateCouponDto } from '@ecom/shared';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CouponsService } from './coupons.service';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('validate')
  validate(@Body(new ZodValidationPipe(ValidateCouponDto)) body: ValidateCouponDto) {
    return this.coupons.validate(body.code, body.subtotal);
  }
}
