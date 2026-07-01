import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionsDto,
  AssignRoleToUsersDto,
  PERM,
} from '@ecom/shared';
import { RolesService } from './roles.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @RequirePermission(PERM.ROLE_READ)
  @Get()
  list() {
    return this.roles.list();
  }

  @RequirePermission(PERM.ROLE_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roles.findById(id);
  }

  @RequirePermission(PERM.ROLE_CREATE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateRoleDto)) body: CreateRoleDto) {
    return this.roles.create(body);
  }

  @RequirePermission(PERM.ROLE_UPDATE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoleDto)) body: UpdateRoleDto,
  ) {
    return this.roles.update(id, body);
  }

  @RequirePermission(PERM.ROLE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roles.delete(id);
  }

  @RequirePermission(PERM.ROLE_ASSIGN_PERMISSIONS)
  @Post(':id/permissions')
  setPermissions(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignPermissionsDto)) body: AssignPermissionsDto,
  ) {
    return this.roles.setPermissions(id, body.permissionIds);
  }

  @RequirePermission(PERM.ROLE_ASSIGN_USERS)
  @Post(':id/users')
  assignUsers(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignRoleToUsersDto)) body: AssignRoleToUsersDto,
  ) {
    return this.roles.assignToUsers(id, body.userIds);
  }
}
