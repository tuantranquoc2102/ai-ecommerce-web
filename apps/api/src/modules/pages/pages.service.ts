import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreatePageDto, ListPagesQuery, UpdatePageDto } from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toSlug } from '../../common/slug';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPagesQuery) {
    const where: Prisma.PageWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.page.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.pageSize,
        ...(query.includeLayout
          ? {}
          : {
              select: {
                id: true,
                title: true,
                slug: true,
                seoTitle: true,
                seoDesc: true,
                status: true,
                publishedAt: true,
                updatedAt: true,
              },
            }),
      }),
      this.prisma.page.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', message: 'Page not found' });
    return page;
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', message: 'Page not found' });
    const layoutJson = await this.hydrateBlocks(page.layoutJson);
    return { ...page, layoutJson };
  }

  /**
   * Resolve block-template links inside a page's layoutJson. Any block with
   * a `templateId` gets its `props` (and `type`) replaced with the current
   * BlockTemplate.config so template edits propagate to every page that
   * links to them. Deleted templates leave the block's stored props intact.
   *
   * This runs on the public /pages/by-slug path only — the admin editor still
   * fetches raw storage so it can display the link + offer Unlink.
   */
  private async hydrateBlocks(layoutJson: Prisma.JsonValue): Promise<Prisma.JsonValue> {
    if (!layoutJson || typeof layoutJson !== 'object' || Array.isArray(layoutJson)) {
      return layoutJson;
    }
    const asObj = layoutJson as { blocks?: unknown };
    const raw = asObj.blocks;
    if (!Array.isArray(raw)) return layoutJson;

    const templateIds = raw
      .map((b) =>
        b && typeof b === 'object' && typeof (b as { templateId?: unknown }).templateId === 'string'
          ? ((b as { templateId: string }).templateId)
          : null,
      )
      .filter((v): v is string => typeof v === 'string');
    if (templateIds.length === 0) return layoutJson;

    const templates = await this.prisma.blockTemplate.findMany({
      where: { id: { in: Array.from(new Set(templateIds)) } },
    });
    const byId = new Map(templates.map((t) => [t.id, t]));

    const nextBlocks = raw.map((b) => {
      if (!b || typeof b !== 'object') return b;
      const block = b as Record<string, unknown>;
      const templateId = typeof block.templateId === 'string' ? block.templateId : null;
      if (!templateId) return block;
      const tpl = byId.get(templateId);
      if (!tpl) return block; // template deleted → keep block's own props
      return {
        ...block,
        // Template drives both type and props at render time. Keeps blocks
        // in sync even if the editor changed a block's underlying type.
        type: tpl.blockType,
        props: tpl.config,
      };
    });

    return { ...(layoutJson as Record<string, unknown>), blocks: nextBlocks } as Prisma.JsonValue;
  }

  async create(input: CreatePageDto) {
    const slug = input.slug ?? toSlug(input.title);
    const exists = await this.prisma.page.findUnique({ where: { slug } });
    if (exists) {
      throw new ConflictException({ code: 'PAGE_EXISTS', message: 'Slug already in use' });
    }
    return this.prisma.page.create({
      data: {
        title: input.title,
        slug,
        layoutJson: input.layoutJson as Prisma.InputJsonValue,
        seoTitle: input.seoTitle ?? null,
        seoDesc: input.seoDesc ?? null,
        status: input.status,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      },
    });
  }

  async update(id: string, input: UpdatePageDto) {
    const current = await this.findById(id);
    const nextSlug = input.slug ?? (input.title ? toSlug(input.title) : current.slug);

    if (nextSlug !== current.slug) {
      const conflict = await this.prisma.page.findFirst({
        where: { AND: [{ id: { not: id } }, { slug: nextSlug }] },
      });
      if (conflict) {
        throw new ConflictException({ code: 'PAGE_EXISTS', message: 'Slug already in use' });
      }
    }

    // publishedAt lifecycle:
    //   DRAFT/SCHEDULED → PUBLISHED : stamp now
    //   PUBLISHED → anything else   : keep the original publishedAt for audit
    const nextStatus = input.status ?? current.status;
    const nextPublishedAt =
      nextStatus === 'PUBLISHED' && current.status !== 'PUBLISHED'
        ? new Date()
        : current.publishedAt;

    return this.prisma.page.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        slug: nextSlug,
        layoutJson:
          input.layoutJson === undefined
            ? undefined
            : (input.layoutJson as Prisma.InputJsonValue),
        seoTitle: input.seoTitle === undefined ? undefined : input.seoTitle,
        seoDesc: input.seoDesc === undefined ? undefined : input.seoDesc,
        status: input.status ?? undefined,
        publishedAt: nextPublishedAt,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.page.delete({ where: { id } });
  }
}
