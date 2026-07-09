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
  AssignRolesToUserDto,
  CreateUserDto,
  ListUsersQuery,
  PERM,
  UpdateUserDto,
} from '@ecom/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermission(PERM.USER_READ)
  @Get()
  list(@Query(new ZodValidationPipe(ListUsersQuery)) query: ListUsersQuery) {
    return this.users.listForAdmin(query);
  }

  @RequirePermission(PERM.USER_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findByIdForAdmin(id);
  }

  @RequirePermission(PERM.USER_READ)
  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.users.getCustomerStats(id);
  }

  @RequirePermission(PERM.USER_CREATE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateUserDto)) body: CreateUserDto) {
    return this.users.adminCreate(body);
  }

  @RequirePermission(PERM.USER_UPDATE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserDto)) body: UpdateUserDto,
  ) {
    return this.users.adminUpdate(id, body);
  }

  /** Replace a user's role assignments (idempotent). */
  @RequirePermission(PERM.ROLE_ASSIGN_USERS)
  @Post(':id/roles')
  setRoles(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignRolesToUserDto)) body: AssignRolesToUserDto,
  ) {
    return this.users.setRoles(id, body.roleIds);
  }

  /**
   * Revoke all active refresh tokens for the user. Access tokens continue to
   * work until their short TTL expires — client will silently fail on next
   * refresh attempt and be forced to re-authenticate.
   */
  @RequirePermission(PERM.USER_UPDATE)
  @HttpCode(HttpStatus.OK)
  @Delete(':id/sessions')
  revokeSessions(@Param('id') id: string) {
    return this.users.revokeAllSessions(id);
  }
}
