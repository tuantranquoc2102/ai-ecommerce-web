import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AddGroupMembersDto,
  CreateCustomerGroupDto,
  CustomerGroupMemberView,
  CustomerGroupRules,
  CustomerGroupType,
  CustomerGroupView,
  ListCustomerGroupsQuery,
  OrderStatus,
  PaginatedCustomerGroups,
  UpdateCustomerGroupDto,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toSlug } from '../../common/slug';

/** Order statuses that count as revenue when computing customer spend/stats. */
const PAIDISH_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPING', 'COMPLETED'];

const GROUP_WITH_COUNT = {
  _count: { select: { members: true } },
} satisfies Prisma.CustomerGroupInclude;

type GroupWithCount = Prisma.CustomerGroupGetPayload<{ include: typeof GROUP_WITH_COUNT }>;

@Injectable()
export class CustomerGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCustomerGroupsQuery): Promise<PaginatedCustomerGroups> {
    const where: Prisma.CustomerGroupWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customerGroup.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
        include: GROUP_WITH_COUNT,
      }),
      this.prisma.customerGroup.count({ where }),
    ]);

    return {
      items: items.map(toGroupView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string): Promise<CustomerGroupView> {
    return toGroupView(await this.getGroupOrThrow(id));
  }

  async listMembers(id: string): Promise<CustomerGroupMemberView[]> {
    await this.getGroupOrThrow(id);
    const members = await this.prisma.customerGroupMember.findMany({
      where: { groupId: id },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });
    return members.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      status: m.user.status,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async create(input: CreateCustomerGroupDto): Promise<CustomerGroupView> {
    const slug = input.slug ?? toSlug(input.name);
    const exists = await this.prisma.customerGroup.findUnique({ where: { slug } });
    if (exists) {
      throw new ConflictException({ code: 'GROUP_EXISTS', message: 'Slug already in use' });
    }

    const group = await this.prisma.customerGroup.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        color: input.color ?? null,
        type: input.type,
        rules: input.rules ? (input.rules as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      include: GROUP_WITH_COUNT,
    });
    return toGroupView(group);
  }

  async update(id: string, input: UpdateCustomerGroupDto): Promise<CustomerGroupView> {
    const current = await this.getGroupOrThrow(id);

    if (input.slug !== undefined && input.slug !== current.slug) {
      const conflict = await this.prisma.customerGroup.findFirst({
        where: { AND: [{ id: { not: id } }, { slug: input.slug }] },
      });
      if (conflict) {
        throw new ConflictException({ code: 'GROUP_EXISTS', message: 'Slug already in use' });
      }
    }

    const group = await this.prisma.customerGroup.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        slug: input.slug ?? undefined,
        description: input.description === undefined ? undefined : input.description,
        color: input.color === undefined ? undefined : input.color,
        type: input.type ?? undefined,
        rules:
          input.rules === undefined
            ? undefined
            : (input.rules as unknown as Prisma.InputJsonValue),
      },
      include: GROUP_WITH_COUNT,
    });
    return toGroupView(group);
  }

  async delete(id: string): Promise<void> {
    await this.getGroupOrThrow(id);
    await this.prisma.customerGroup.delete({ where: { id } });
  }

  async addMembers(id: string, input: AddGroupMembersDto): Promise<CustomerGroupView> {
    const group = await this.getGroupOrThrow(id);
    if (group.type === 'DYNAMIC') {
      throw new BadRequestException({
        code: 'GROUP_IS_DYNAMIC',
        message: 'Dynamic group membership is computed, not assigned manually',
      });
    }
    await this.prisma.customerGroupMember.createMany({
      data: input.userIds.map((userId) => ({ groupId: id, userId })),
      skipDuplicates: true,
    });
    return this.findById(id);
  }

  async removeMember(id: string, userId: string): Promise<void> {
    await this.getGroupOrThrow(id);
    await this.prisma.customerGroupMember.deleteMany({ where: { groupId: id, userId } });
  }

  /**
   * Recompute a DYNAMIC group's membership: evaluate the stored `rules` against
   * every CUSTOMER-role user and REPLACE the membership set with the matches.
   * A customer matches when ALL provided rules pass.
   */
  async recompute(id: string): Promise<CustomerGroupView> {
    const group = await this.getGroupOrThrow(id);
    if (group.type !== 'DYNAMIC') {
      throw new BadRequestException({
        code: 'GROUP_NOT_DYNAMIC',
        message: 'Only dynamic groups can be recomputed',
      });
    }

    const rules = (group.rules as unknown as CustomerGroupRules | null) ?? {};

    const customers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        userRoles: { some: { role: { code: 'CUSTOMER' } } },
      },
      select: { id: true, status: true },
    });
    const customerIds = customers.map((c) => c.id);

    const statsByUser = new Map<
      string,
      { totalSpent: Prisma.Decimal; orderCount: number; lastOrderAt: Date | null }
    >();
    if (customerIds.length > 0) {
      const grouped = await this.prisma.order.groupBy({
        by: ['userId'],
        where: { status: { in: PAIDISH_STATUSES }, userId: { in: customerIds } },
        _sum: { totalAmount: true },
        _count: true,
        _max: { createdAt: true },
      });
      for (const row of grouped) {
        if (!row.userId) continue;
        statsByUser.set(row.userId, {
          totalSpent: row._sum.totalAmount ?? new Prisma.Decimal(0),
          orderCount: row._count,
          lastOrderAt: row._max.createdAt,
        });
      }
    }

    const now = Date.now();
    const matched = customers.filter((c) => {
      const stats = statsByUser.get(c.id);
      const totalSpent = stats?.totalSpent ?? new Prisma.Decimal(0);
      const orderCount = stats?.orderCount ?? 0;
      const lastOrderAt = stats?.lastOrderAt ?? null;

      if (rules.minTotalSpent !== undefined && totalSpent.lessThan(rules.minTotalSpent)) {
        return false;
      }
      if (rules.minOrderCount !== undefined && orderCount < rules.minOrderCount) {
        return false;
      }
      if (rules.lastOrderWithinDays !== undefined) {
        if (!lastOrderAt) return false;
        const ageDays = (now - lastOrderAt.getTime()) / 86_400_000;
        if (ageDays > rules.lastOrderWithinDays) return false;
      }
      if (rules.status !== undefined && c.status !== rules.status) {
        return false;
      }
      return true;
    });

    await this.prisma.$transaction([
      this.prisma.customerGroupMember.deleteMany({ where: { groupId: id } }),
      this.prisma.customerGroupMember.createMany({
        data: matched.map((c) => ({ groupId: id, userId: c.id })),
        skipDuplicates: true,
      }),
    ]);

    return this.findById(id);
  }

  private async getGroupOrThrow(id: string): Promise<GroupWithCount> {
    const group = await this.prisma.customerGroup.findUnique({
      where: { id },
      include: GROUP_WITH_COUNT,
    });
    if (!group) {
      throw new NotFoundException({ code: 'GROUP_NOT_FOUND', message: 'Customer group not found' });
    }
    return group;
  }
}

function toGroupView(g: GroupWithCount): CustomerGroupView {
  return {
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
    color: g.color,
    type: g.type as CustomerGroupType,
    rules: (g.rules as unknown as CustomerGroupRules | null) ?? null,
    memberCount: g._count.members,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}
