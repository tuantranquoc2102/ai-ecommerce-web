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
  CreatePageDto,
  ListPagesQuery,
  PERM,
  UpdatePageDto,
} from '@ecom/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PagesService } from './pages.service';

@Controller('pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @RequirePermission(PERM.PAGE_READ)
  @Get()
  list(@Query(new ZodValidationPipe(ListPagesQuery)) query: ListPagesQuery) {
    return this.pages.list(query);
  }

  @RequirePermission(PERM.PAGE_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pages.findById(id);
  }

  /**
   * Public: storefront fetches a published page by slug to render.
   * Only PUBLISHED pages should be visible to anonymous visitors — enforced
   * at the service call site (or via a query flag) once storefront lands.
   * For now, the guard is open and the service filter is a follow-up.
   */
  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.pages.findBySlug(slug);
  }

  @RequirePermission(PERM.PAGE_WRITE)
  @Post()
  create(@Body(new ZodValidationPipe(CreatePageDto)) body: CreatePageDto) {
    return this.pages.create(body);
  }

  @RequirePermission(PERM.PAGE_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePageDto)) body: UpdatePageDto,
  ) {
    return this.pages.update(id, body);
  }

  @RequirePermission(PERM.PAGE_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pages.delete(id);
  }
}
