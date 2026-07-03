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
  CreateTagDto,
  ListTagsQuery,
  PERM,
  UpdateTagDto,
} from '@ecom/shared';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @RequirePermission(PERM.TAG_READ)
  @Get()
  list(@Query(new ZodValidationPipe(ListTagsQuery)) query: ListTagsQuery) {
    return this.tags.list(query);
  }

  /**
   * Storefront tag filter list — only tags with at least one active product.
   */
  @Public()
  @Get('public/list')
  publicList() {
    return this.tags.listPublic();
  }

  @RequirePermission(PERM.TAG_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tags.findById(id);
  }

  @RequirePermission(PERM.TAG_WRITE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateTagDto)) body: CreateTagDto) {
    return this.tags.create(body);
  }

  @RequirePermission(PERM.TAG_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTagDto)) body: UpdateTagDto,
  ) {
    return this.tags.update(id, body);
  }

  @RequirePermission(PERM.TAG_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tags.delete(id);
  }
}
