import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PermissionsService } from '../authz/permissions.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async list() {
    return this.prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { userRoles: true, rolePermissions: true } },
      },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
    return role;
  }

  async create(input: { code: string; name: string; description?: string }) {
    const exists = await this.prisma.role.findFirst({
      where: { OR: [{ code: input.code }, { name: input.name }] },
    });
    if (exists) throw new ConflictException({ code: 'ROLE_EXISTS', message: 'Role code or name already exists' });
    const role = await this.prisma.role.create({
      data: { code: input.code, name: input.name, description: input.description ?? null, isSystem: false },
    });
    await this.permissions.invalidateAll();
    return role;
  }

  async update(id: string, input: { name?: string; description?: string }) {
    const role = await this.findById(id);
    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data: { name: input.name ?? undefined, description: input.description ?? undefined },
    });
    return updated;
  }

  async delete(id: string) {
    const role = await this.findById(id);
    if (role.isSystem) {
      throw new ForbiddenException({ code: 'ROLE_PROTECTED', message: 'System roles cannot be deleted' });
    }
    await this.prisma.role.delete({ where: { id: role.id } });
    await this.permissions.invalidateAll();
  }

  /**
   * Assign a flat list of permission IDs to a role, atomically replacing
   * any previous assignment. Uses a single DB transaction so the role is
   * never observable in a partial state; flushes the authz cache on commit.
   */
  async setPermissions(roleId: string, permissionIds: string[]): Promise<{ count: number }> {
    await this.findById(roleId);
    const unique = Array.from(new Set(permissionIds));

    if (unique.length > 0) {
      const found = await this.prisma.permission.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      if (found.length !== unique.length) {
        throw new BadRequestException({
          code: 'UNKNOWN_PERMISSION',
          message: 'One or more permissionIds do not exist',
        });
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (unique.length === 0) return 0;
      const created = await tx.rolePermission.createMany({
        data: unique.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
      return created.count;
    });

    await this.permissions.invalidateAll();
    return { count: result };
  }

  async assignToUsers(roleId: string, userIds: string[]): Promise<{ count: number }> {
    await this.findById(roleId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });
    if (users.length !== userIds.length) {
      throw new BadRequestException({ code: 'UNKNOWN_USER', message: 'One or more userIds do not exist' });
    }
    const created = await this.prisma.userRole.createMany({
      data: userIds.map((userId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
    await this.permissions.invalidateAll();
    return { count: created.count };
  }
}
