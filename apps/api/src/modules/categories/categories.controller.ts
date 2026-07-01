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
  CreateCategoryDto,
  ListCategoriesQuery,
  PERM,
  UpdateCategoryDto,
} from '@ecom/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @RequirePermission(PERM.CATEGORY_READ)
  @Get()
  list(@Query(new ZodValidationPipe(ListCategoriesQuery)) query: ListCategoriesQuery) {
    return this.categories.list(query);
  }

  @RequirePermission(PERM.CATEGORY_READ)
  @Get('tree')
  tree() {
    return this.categories.tree();
  }

  @RequirePermission(PERM.CATEGORY_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findById(id);
  }

  @RequirePermission(PERM.CATEGORY_WRITE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateCategoryDto)) body: CreateCategoryDto) {
    return this.categories.create(body);
  }

  @RequirePermission(PERM.CATEGORY_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCategoryDto)) body: UpdateCategoryDto,
  ) {
    return this.categories.update(id, body);
  }

  @RequirePermission(PERM.CATEGORY_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.delete(id);
  }
}
