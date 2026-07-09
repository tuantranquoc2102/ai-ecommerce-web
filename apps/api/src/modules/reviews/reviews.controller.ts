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
  AdminListReviewsQuery,
  ModerateReviewDto,
  PERM,
  ReplyReviewDto,
} from '@ecom/shared';
import {
  CurrentUser,
  type RequestUser,
} from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @RequirePermission(PERM.REVIEW_READ)
  @Get()
  list(@Query(new ZodValidationPipe(AdminListReviewsQuery)) query: AdminListReviewsQuery) {
    return this.reviews.list(query);
  }

  @RequirePermission(PERM.REVIEW_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviews.findById(id);
  }

  @RequirePermission(PERM.REVIEW_MODERATE)
  @Patch(':id/moderate')
  moderate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ModerateReviewDto)) body: ModerateReviewDto,
  ) {
    return this.reviews.moderate(id, body);
  }

  @RequirePermission(PERM.REVIEW_MODERATE)
  @Post(':id/reply')
  reply(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReplyReviewDto)) body: ReplyReviewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reviews.reply(id, body, user.id);
  }

  @RequirePermission(PERM.REVIEW_MODERATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviews.delete(id);
  }
}
