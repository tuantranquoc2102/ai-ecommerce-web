import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  PERM,
  UpdateFooterConfigDto,
  UpdateGeneralSettingsDto,
  UpdatePaymentSettingsDto,
  UpdateShippingSettingsDto,
} from '@ecom/shared';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Admin: read the footer config for the editor. */
  @RequirePermission(PERM.SETTING_READ)
  @Get('footer')
  getFooter() {
    return this.settings.getFooter();
  }

  /** Admin: replace the footer config. */
  @RequirePermission(PERM.SETTING_WRITE)
  @Put('footer')
  setFooter(@Body(new ZodValidationPipe(UpdateFooterConfigDto)) body: UpdateFooterConfigDto) {
    return this.settings.setFooter(body);
  }

  @RequirePermission(PERM.SETTING_READ)
  @Get('payments')
  getPayments() {
    return this.settings.getPayments();
  }

  @RequirePermission(PERM.SETTING_WRITE)
  @Put('payments')
  setPayments(
    @Body(new ZodValidationPipe(UpdatePaymentSettingsDto)) body: UpdatePaymentSettingsDto,
  ) {
    return this.settings.setPayments(body);
  }

  @RequirePermission(PERM.SETTING_READ)
  @Get('shipping')
  getShipping() {
    return this.settings.getShipping();
  }

  @RequirePermission(PERM.SETTING_WRITE)
  @Put('shipping')
  setShipping(
    @Body(new ZodValidationPipe(UpdateShippingSettingsDto)) body: UpdateShippingSettingsDto,
  ) {
    return this.settings.setShipping(body);
  }

  @RequirePermission(PERM.SETTING_READ)
  @Get('general')
  getGeneral() {
    return this.settings.getGeneral();
  }

  @RequirePermission(PERM.SETTING_WRITE)
  @Put('general')
  setGeneral(@Body(new ZodValidationPipe(UpdateGeneralSettingsDto)) body: UpdateGeneralSettingsDto) {
    return this.settings.setGeneral(body);
  }

  /**
   * Public: storefront reads the footer anonymously. Only the footer key is
   * exposed publicly — there is deliberately no generic public settings route,
   * so future private settings (payments, etc.) can't leak here.
   */
  @Public()
  @Get('public/footer')
  publicFooter() {
    return this.settings.getFooter();
  }
}
