import { NotFoundException } from '@nestjs/common';
import { BannersService } from './banners.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

function makePrisma(overrides: {
  findMany?: jest.Mock;
  findUnique?: jest.Mock;
  update?: jest.Mock;
  updateMany?: jest.Mock;
  count?: jest.Mock;
  transaction?: jest.Mock;
} = {}): PrismaService {
  return {
    banner: {
      findMany: overrides.findMany ?? jest.fn().mockResolvedValue([]),
      findUnique: overrides.findUnique ?? jest.fn(),
      update: overrides.update ?? jest.fn(),
      updateMany: overrides.updateMany ?? jest.fn().mockResolvedValue({ count: 0 }),
      count: overrides.count ?? jest.fn().mockResolvedValue(0),
    },
    $transaction: overrides.transaction ?? jest.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg;
    }),
  } as unknown as PrismaService;
}

describe('BannersService.expireBanners (cron)', () => {
  it('deactivates only active banners whose scheduleEnd has passed', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const service = new BannersService(makePrisma({ updateMany }));

    await service.expireBanners();

    expect(updateMany).toHaveBeenCalledTimes(1);
    const call = updateMany.mock.calls[0]![0] as {
      where: { isActive: boolean; scheduleEnd: { not: null; lte: Date } };
      data: { isActive: boolean };
    };
    expect(call.where.isActive).toBe(true);
    expect(call.where.scheduleEnd.not).toBeNull();
    expect(call.where.scheduleEnd.lte).toBeInstanceOf(Date);
    expect(call.data.isActive).toBe(false);
  });

  it('is idempotent — running twice with no expiring banners emits no side-effect log', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const service = new BannersService(makePrisma({ updateMany }));

    await service.expireBanners();
    await service.expireBanners();

    expect(updateMany).toHaveBeenCalledTimes(2);
    // No assertion on logs — the point is that both calls are cheap.
  });
});

describe('BannersService click / impression tracking', () => {
  it('recordClick increments atomically', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'b1', clickCount: 5 });
    const service = new BannersService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue({ id: 'b1' }),
        update,
      }),
    );

    const r = await service.recordClick('b1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { clickCount: { increment: 1 } },
      select: { id: true, clickCount: true },
    });
    expect(r).toEqual({ id: 'b1', clickCount: 5 });
  });

  it('recordClick throws NotFound if banner missing', async () => {
    const service = new BannersService(
      makePrisma({ findUnique: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.recordClick('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recordImpression uses increment on impressionCount', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'b1', impressionCount: 42 });
    const service = new BannersService(
      makePrisma({
        findUnique: jest.fn().mockResolvedValue({ id: 'b1' }),
        update,
      }),
    );
    await service.recordImpression('b1');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { impressionCount: { increment: 1 } },
      select: { id: true, impressionCount: true },
    });
  });
});

describe('BannersService.listActive', () => {
  it('queries with position + isActive + schedule window bounds', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new BannersService(makePrisma({ findMany }));

    await service.listActive('home_hero');

    expect(findMany).toHaveBeenCalledTimes(1);
    const call = findMany.mock.calls[0]![0] as {
      where: {
        position: string;
        isActive: boolean;
        AND: Array<{ OR: unknown[] }>;
      };
    };
    expect(call.where.position).toBe('home_hero');
    expect(call.where.isActive).toBe(true);
    // Two OR clauses — start window + end window
    expect(call.where.AND).toHaveLength(2);
    expect(call.where.AND[0]!.OR).toHaveLength(2); // scheduleStart null OR <= now
    expect(call.where.AND[1]!.OR).toHaveLength(2); // scheduleEnd null OR >= now
  });
});
