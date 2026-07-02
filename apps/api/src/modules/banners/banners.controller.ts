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
import {
  CreateBannerDto,
  ListBannersQuery,
  PERM,
  UpdateBannerDto,
} from '@ecom/shared';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BannersService } from './banners.service';

@Controller('banners')
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  @RequirePermission(PERM.BANNER_READ)
  @Get()
  list(@Query(new ZodValidationPipe(ListBannersQuery)) query: ListBannersQuery) {
    return this.banners.list(query);
  }

  @RequirePermission(PERM.BANNER_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.banners.findById(id);
  }

  /** Public storefront query: currently-active banners at a position. */
  @Public()
  @Get('active/:position')
  active(@Param('position') position: string) {
    return this.banners.listActive(position);
  }

  /**
   * Public click tracking. Anonymous — an admin permission gate here would
   * defeat the purpose (visitors need to trigger it). Rate limiting should be
   * added at the reverse proxy / WAF layer in production.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(':id/click')
  click(@Param('id') id: string) {
    return this.banners.recordClick(id);
  }

  /** Public impression tracking (optional — call from storefront IntersectionObserver). */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post(':id/impression')
  impression(@Param('id') id: string) {
    return this.banners.recordImpression(id);
  }

  @RequirePermission(PERM.BANNER_WRITE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateBannerDto)) body: CreateBannerDto) {
    return this.banners.create(body);
  }

  @RequirePermission(PERM.BANNER_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBannerDto)) body: UpdateBannerDto,
  ) {
    return this.banners.update(id, body);
  }

  @RequirePermission(PERM.BANNER_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.banners.delete(id);
  }
}
