import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PermissionsService } from '../authz/permissions.service';
import type { CreatePermissionDto, UpdatePermissionDto } from '@ecom/shared';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async list(filters: { type?: 'MENU' | 'ELEMENT' | 'API'; q?: string } = {}) {
    return this.prisma.permission.findMany({
      where: {
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.q
          ? {
              OR: [
                { code: { contains: filters.q, mode: 'insensitive' } },
                { name: { contains: filters.q, mode: 'insensitive' } },
                { apiEndpoint: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  async create(input: CreatePermissionDto) {
    const exists = await this.prisma.permission.findUnique({ where: { code: input.code } });
    if (exists) throw new ConflictException({ code: 'PERMISSION_EXISTS', message: 'Permission code already exists' });
    if (input.parentId) await this.assertParentExists(input.parentId);
    if (input.type === 'API' && !input.apiEndpoint) {
      throw new BadRequestException({ code: 'API_ENDPOINT_REQUIRED', message: 'API permissions require an apiEndpoint' });
    }
    const created = await this.prisma.permission.create({
      data: {
        code: input.code,
        name: input.name,
        type: input.type,
        urlPath: input.urlPath ?? null,
        apiEndpoint: input.apiEndpoint ?? null,
        parentId: input.parentId ?? null,
      },
    });
    await this.permissions.invalidateAll();
    return created;
  }

  async update(id: string, input: UpdatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'PERMISSION_NOT_FOUND', message: 'Permission not found' });
    if (input.parentId) await this.assertParentExists(input.parentId, id);
    const updated = await this.prisma.permission.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        type: input.type ?? undefined,
        urlPath: input.urlPath ?? undefined,
        apiEndpoint: input.apiEndpoint ?? undefined,
        parentId: input.parentId ?? undefined,
      },
    });
    await this.permissions.invalidateAll();
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.permission.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'PERMISSION_NOT_FOUND', message: 'Permission not found' });
    await this.prisma.permission.delete({ where: { id } });
    await this.permissions.invalidateAll();
  }

  private async assertParentExists(parentId: string, selfId?: string): Promise<void> {
    if (selfId && parentId === selfId) {
      throw new BadRequestException({ code: 'PARENT_IS_SELF', message: 'A permission cannot be its own parent' });
    }
    const parent = await this.prisma.permission.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw new BadRequestException({ code: 'PARENT_NOT_FOUND', message: 'Parent permission not found' });
    }
  }
}
