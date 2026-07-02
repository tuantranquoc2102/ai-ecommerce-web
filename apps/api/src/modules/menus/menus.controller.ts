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
  CreateMenuDto,
  MenuPosition,
  PERM,
  UpdateMenuDto,
} from '@ecom/shared';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { MenusService } from './menus.service';

@Controller('menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @RequirePermission(PERM.MENU_READ)
  @Get()
  list(@Query('position') positionRaw?: string) {
    const position = positionRaw ? MenuPosition.parse(positionRaw) : undefined;
    return this.menus.list(position);
  }

  @RequirePermission(PERM.MENU_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menus.findById(id);
  }

  /**
   * Public: storefront pulls navigation trees anonymously.
   * Storefront should cache these client-side.
   */
  @Public()
  @Get('public/:position')
  publicByPosition(@Param('position') positionRaw: string) {
    const position = MenuPosition.parse(positionRaw);
    return this.menus.list(position);
  }

  @RequirePermission(PERM.MENU_WRITE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateMenuDto)) body: CreateMenuDto) {
    return this.menus.create(body);
  }

  @RequirePermission(PERM.MENU_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMenuDto)) body: UpdateMenuDto,
  ) {
    return this.menus.update(id, body);
  }

  @RequirePermission(PERM.MENU_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menus.delete(id);
  }
}
