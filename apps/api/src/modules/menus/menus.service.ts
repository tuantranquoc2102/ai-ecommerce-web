import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateMenuDto, MenuPosition, UpdateMenuDto } from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  async list(position?: MenuPosition) {
    return this.prisma.menu.findMany({
      where: position ? { position } : undefined,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException({ code: 'MENU_NOT_FOUND', message: 'Menu not found' });
    return menu;
  }

  async create(input: CreateMenuDto) {
    return this.prisma.menu.create({
      data: {
        name: input.name,
        position: input.position,
        hierarchyJson: (input.hierarchyJson ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  async update(id: string, input: UpdateMenuDto) {
    await this.findById(id);
    return this.prisma.menu.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        position: input.position ?? undefined,
        hierarchyJson:
          input.hierarchyJson === undefined
            ? undefined
            : ((input.hierarchyJson ?? []) as Prisma.InputJsonValue),
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.menu.delete({ where: { id } });
  }
}
