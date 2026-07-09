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
  AddGroupMembersDto,
  CreateCustomerGroupDto,
  ListCustomerGroupsQuery,
  PERM,
  UpdateCustomerGroupDto,
} from '@ecom/shared';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CustomerGroupsService } from './customer-groups.service';

@Controller('customer-groups')
export class CustomerGroupsController {
  constructor(private readonly groups: CustomerGroupsService) {}

  @RequirePermission(PERM.CUSTOMER_GROUP_READ)
  @Get()
  list(
    @Query(new ZodValidationPipe(ListCustomerGroupsQuery)) query: ListCustomerGroupsQuery,
  ) {
    return this.groups.list(query);
  }

  @RequirePermission(PERM.CUSTOMER_GROUP_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groups.findById(id);
  }

  @RequirePermission(PERM.CUSTOMER_GROUP_READ)
  @Get(':id/members')
  listMembers(@Param('id') id: string) {
    return this.groups.listMembers(id);
  }

  @RequirePermission(PERM.CUSTOMER_GROUP_WRITE)
  @Post()
  create(@Body(new ZodValidationPipe(CreateCustomerGroupDto)) body: CreateCustomerGroupDto) {
    return this.groups.create(body);
  }

  @RequirePermission(PERM.CUSTOMER_GROUP_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCustomerGroupDto)) body: UpdateCustomerGroupDto,
  ) {
    return this.groups.update(id, body);
  }

  @RequirePermission(PERM.CUSTOMER_GROUP_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groups.delete(id);
  }

  @RequirePermission(PERM.CUSTOMER_GROUP_WRITE)
  @Post(':id/members')
  addMembers(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddGroupMembersDto)) body: AddGroupMembersDto,
  ) {
    return this.groups.addMembers(id, body);
  }

  @RequirePermission(PERM.CUSTOMER_GROUP_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.groups.removeMember(id, userId);
  }

  @RequirePermission(PERM.CUSTOMER_GROUP_WRITE)
  @Post(':id/recompute')
  recompute(@Param('id') id: string) {
    return this.groups.recompute(id);
  }
}
