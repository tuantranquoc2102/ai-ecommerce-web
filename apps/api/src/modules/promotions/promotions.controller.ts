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
  CreatePromotionDto,
  ListPromotionsQuery,
  PERM,
  UpdatePromotionDto,
} from '@ecom/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @RequirePermission(PERM.PROMOTION_READ)
  @Get()
  list(@Query(new ZodValidationPipe(ListPromotionsQuery)) query: ListPromotionsQuery) {
    return this.promotions.list(query);
  }

  @RequirePermission(PERM.PROMOTION_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotions.findById(id);
  }

  @RequirePermission(PERM.PROMOTION_WRITE)
  @Post()
  create(@Body(new ZodValidationPipe(CreatePromotionDto)) body: CreatePromotionDto) {
    return this.promotions.create(body);
  }

  @RequirePermission(PERM.PROMOTION_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePromotionDto)) body: UpdatePromotionDto,
  ) {
    return this.promotions.update(id, body);
  }

  @RequirePermission(PERM.PROMOTION_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotions.delete(id);
  }
}
