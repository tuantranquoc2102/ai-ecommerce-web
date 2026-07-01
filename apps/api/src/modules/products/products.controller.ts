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
  CreateProductDto,
  ListProductsQuery,
  PERM,
  UpdateProductDto,
} from '@ecom/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @RequirePermission(PERM.PRODUCT_READ)
  @Get()
  list(@Query(new ZodValidationPipe(ListProductsQuery)) query: ListProductsQuery) {
    return this.products.list(query);
  }

  @RequirePermission(PERM.PRODUCT_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findById(id);
  }

  @RequirePermission(PERM.PRODUCT_CREATE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateProductDto)) body: CreateProductDto) {
    return this.products.create(body);
  }

  @RequirePermission(PERM.PRODUCT_UPDATE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProductDto)) body: UpdateProductDto,
  ) {
    return this.products.update(id, body);
  }

  @RequirePermission(PERM.PRODUCT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.products.delete(id);
  }
}
