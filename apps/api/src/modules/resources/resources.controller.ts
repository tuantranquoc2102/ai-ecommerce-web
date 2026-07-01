import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PERM,
} from '@ecom/shared';
import { ResourcesService } from './resources.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('permissions')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @RequirePermission(PERM.PERMISSION_READ)
  @Get()
  list(@Query('type') type?: 'MENU' | 'ELEMENT' | 'API', @Query('q') q?: string) {
    return this.resources.list({ type, q });
  }

  @RequirePermission(PERM.PERMISSION_CREATE)
  @Post()
  create(@Body(new ZodValidationPipe(CreatePermissionDto)) body: CreatePermissionDto) {
    return this.resources.create(body);
  }

  @RequirePermission(PERM.PERMISSION_UPDATE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePermissionDto)) body: UpdatePermissionDto,
  ) {
    return this.resources.update(id, body);
  }

  @RequirePermission(PERM.PERMISSION_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resources.delete(id);
  }
}
