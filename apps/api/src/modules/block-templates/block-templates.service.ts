import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateBlockTemplateDto,
  ListBlockTemplatesQuery,
  UpdateBlockTemplateDto,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BlockTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListBlockTemplatesQuery) {
    const where: Prisma.BlockTemplateWhereInput = {
      ...(query.blockType ? { blockType: query.blockType } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { blockType: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.blockTemplate.findMany({
        where,
        orderBy: [{ blockType: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.blockTemplate.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const template = await this.prisma.blockTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException({
        code: 'BLOCK_TEMPLATE_NOT_FOUND',
        message: 'Block template not found',
      });
    }
    return template;
  }

  async create(input: CreateBlockTemplateDto) {
    return this.prisma.blockTemplate.create({
      data: {
        name: input.name,
        blockType: input.blockType,
        config: input.config as Prisma.InputJsonValue,
        previewImage: input.previewImage ?? null,
      },
    });
  }

  async update(id: string, input: UpdateBlockTemplateDto) {
    await this.findById(id);
    return this.prisma.blockTemplate.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        blockType: input.blockType ?? undefined,
        config:
          input.config === undefined
            ? undefined
            : (input.config as Prisma.InputJsonValue),
        previewImage: input.previewImage === undefined ? undefined : input.previewImage,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.blockTemplate.delete({ where: { id } });
  }
}
