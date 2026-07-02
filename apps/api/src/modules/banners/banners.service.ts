import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import type {
  CreateBannerDto,
  ListBannersQuery,
  UpdateBannerDto,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BannersService {
  private readonly log = new Logger(BannersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListBannersQuery) {
    const where: Prisma.BannerWhereInput = {
      ...(query.position ? { position: query.position } : {}),
      ...(query.active !== undefined ? { isActive: query.active } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.banner.findMany({
        where,
        orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.banner.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * Public storefront query: banners at `position` that are currently within
   * their schedule window and marked active. Used by the front-end block that
   * renders hero sliders / promo strips.
   */
  async listActive(position: string) {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        position,
        isActive: true,
        AND: [
          {
            OR: [{ scheduleStart: null }, { scheduleStart: { lte: now } }],
          },
          {
            OR: [{ scheduleEnd: null }, { scheduleEnd: { gte: now } }],
          },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async findById(id: string) {
    const b = await this.prisma.banner.findUnique({ where: { id } });
    if (!b) throw new NotFoundException({ code: 'BANNER_NOT_FOUND', message: 'Banner not found' });
    return b;
  }

  async create(input: CreateBannerDto) {
    return this.prisma.banner.create({
      data: {
        position: input.position,
        imageUrl: input.imageUrl,
        targetUrl: input.targetUrl ?? null,
        altText: input.altText ?? null,
        scheduleStart: input.scheduleStart ?? null,
        scheduleEnd: input.scheduleEnd ?? null,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });
  }

  async update(id: string, input: UpdateBannerDto) {
    await this.findById(id);
    return this.prisma.banner.update({
      where: { id },
      data: {
        position: input.position ?? undefined,
        imageUrl: input.imageUrl ?? undefined,
        targetUrl: input.targetUrl === undefined ? undefined : input.targetUrl,
        altText: input.altText === undefined ? undefined : input.altText,
        scheduleStart:
          input.scheduleStart === undefined ? undefined : input.scheduleStart,
        scheduleEnd: input.scheduleEnd === undefined ? undefined : input.scheduleEnd,
        isActive: input.isActive ?? undefined,
        sortOrder: input.sortOrder ?? undefined,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.banner.delete({ where: { id } });
  }

  /** Atomic +1 on clickCount. Storefront calls this on banner clicks. */
  async recordClick(id: string) {
    await this.findById(id);
    const updated = await this.prisma.banner.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
      select: { id: true, clickCount: true },
    });
    return updated;
  }

  /** Atomic +1 on impressionCount. Optional — track viewability. */
  async recordImpression(id: string) {
    await this.findById(id);
    const updated = await this.prisma.banner.update({
      where: { id },
      data: { impressionCount: { increment: 1 } },
      select: { id: true, impressionCount: true },
    });
    return updated;
  }

  /**
   * Runs every minute. Auto-deactivates any active banner whose scheduleEnd
   * has passed. Idempotent — bounded by `isActive: true` filter.
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'banner-scheduler' })
  async expireBanners() {
    const now = new Date();
    const result = await this.prisma.banner.updateMany({
      where: {
        isActive: true,
        scheduleEnd: { not: null, lte: now },
      },
      data: { isActive: false },
    });
    if (result.count > 0) {
      this.log.log(`Auto-deactivated ${result.count} expired banner(s)`);
    }
  }
}
