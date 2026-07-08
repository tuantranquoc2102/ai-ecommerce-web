import { Body, Controller, Get, Put } from '@nestjs/common';
import { PERM, UpdateFooterConfigDto } from '@ecom/shared';
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
