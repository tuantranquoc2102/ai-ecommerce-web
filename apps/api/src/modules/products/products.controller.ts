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
import { Public } from '../../common/decorators/public.decorator';
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

  /**
   * Public storefront lookup. Only ACTIVE, non-deleted products are returned
   * to anonymous visitors — anything else 404s so drafts/archives stay hidden.
   */
  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.products.findPublicBySlug(slug);
  }

  /**
   * Public storefront listing. Same filters as admin list but hard-forces
   * status=ACTIVE + deletedAt=null. Used by ProductGrid blocks + /products.
   */
  @Public()
  @Get('public/list')
  publicList(@Query(new ZodValidationPipe(ListProductsQuery)) query: ListProductsQuery) {
    return this.products.list({ ...query, status: 'ACTIVE' });
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
