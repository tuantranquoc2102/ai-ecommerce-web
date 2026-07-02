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
  CreateBlockTemplateDto,
  ListBlockTemplatesQuery,
  PERM,
  UpdateBlockTemplateDto,
} from '@ecom/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BlockTemplatesService } from './block-templates.service';

@Controller('block-templates')
export class BlockTemplatesController {
  constructor(private readonly templates: BlockTemplatesService) {}

  @RequirePermission(PERM.BLOCK_TEMPLATE_READ)
  @Get()
  list(@Query(new ZodValidationPipe(ListBlockTemplatesQuery)) query: ListBlockTemplatesQuery) {
    return this.templates.list(query);
  }

  @RequirePermission(PERM.BLOCK_TEMPLATE_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templates.findById(id);
  }

  @RequirePermission(PERM.BLOCK_TEMPLATE_WRITE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateBlockTemplateDto)) body: CreateBlockTemplateDto) {
    return this.templates.create(body);
  }

  @RequirePermission(PERM.BLOCK_TEMPLATE_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBlockTemplateDto)) body: UpdateBlockTemplateDto,
  ) {
    return this.templates.update(id, body);
  }

  @RequirePermission(PERM.BLOCK_TEMPLATE_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templates.delete(id);
  }
}
