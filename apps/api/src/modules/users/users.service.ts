import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateUserDto,
  CustomerStatsView,
  ListUsersQuery,
  OrderStatus,
  UpdateUserDto,
  UserStatus,
} from '@ecom/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PermissionsService } from '../authz/permissions.service';
import * as bcrypt from 'bcrypt';

/** Order statuses that count as revenue when computing customer spend/stats. */
const PAIDISH_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPING', 'COMPLETED'];

const USER_SUMMARY_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  status: true,
  internalNote: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  userRoles: { include: { role: { select: { id: true, code: true, name: true } } } },
} as const;

/** Detail select for the single-customer 360° view: summary + group memberships. */
const USER_DETAIL_SELECT = {
  ...USER_SUMMARY_SELECT,
  groupMemberships: {
    include: { group: { select: { id: true, name: true, color: true, type: true } } },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdWithRoles(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async createWithPassword(input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        passwordHash,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        status: 'ACTIVE',
      },
    });
  }

  async createPasswordless(email: string) {
    return this.prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      },
    });
  }

  async updatePassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async verifyPassword(user: { passwordHash: string | null }, candidate: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(candidate, user.passwordHash);
  }

  async assignRoleByCode(userId: string, roleCode: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) return;
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }

  async findOrCreateFromOAuth(input: {
    provider: 'google' | 'facebook';
    providerUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    const link = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: input.provider, providerUserId: input.providerUserId } },
      include: { user: true },
    });
    if (link) return link.user;

    const existing = await this.findByEmail(input.email);
    if (existing) {
      await this.prisma.oAuthAccount.create({
        data: { provider: input.provider, providerUserId: input.providerUserId, userId: existing.id },
      });
      return existing;
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        oauthAccounts: {
          create: { provider: input.provider, providerUserId: input.providerUserId },
        },
      },
    });
    return user;
  }

  // ---------------------------------------------------------------------------
  // Admin CRUD (used by users.controller for the /admin/users screen)
  // ---------------------------------------------------------------------------

  async listForAdmin(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.roleId ? { userRoles: { some: { roleId: query.roleId } } } : {}),
      ...(query.roleCode
        ? { userRoles: { some: { role: { code: query.roleCode } } } }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
        select: USER_SUMMARY_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findByIdForAdmin(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_DETAIL_SELECT,
    });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    return user;
  }

  async adminCreate(input: CreateUserDto) {
    const email = input.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) {
      throw new ConflictException({ code: 'EMAIL_EXISTS', message: 'Email already registered' });
    }
    await this.assertRolesExist(input.roleIds);

    // Resolve any roleCodes → role ids and merge with the explicit roleIds so an
    // admin can create e.g. a CUSTOMER without needing role.read to look up ids.
    const roleIdsFromCodes = input.roleCodes?.length
      ? (
          await this.prisma.role.findMany({
            where: { code: { in: input.roleCodes } },
            select: { id: true },
          })
        ).map((r) => r.id)
      : [];
    const roleIds = Array.from(new Set([...(input.roleIds ?? []), ...roleIdsFromCodes]));

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        avatarUrl: input.avatarUrl ?? null,
        status: input.status,
        userRoles: roleIds.length
          ? { create: roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      select: USER_SUMMARY_SELECT,
    });

    if (roleIds.length) await this.permissions.invalidateUser(user.id);
    return user;
  }

  async adminUpdate(id: string, input: UpdateUserDto) {
    await this.findByIdForAdmin(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        firstName: input.firstName === undefined ? undefined : input.firstName,
        lastName: input.lastName === undefined ? undefined : input.lastName,
        phone: input.phone === undefined ? undefined : input.phone,
        avatarUrl: input.avatarUrl === undefined ? undefined : input.avatarUrl,
        status: input.status ?? undefined,
        internalNote: input.internalNote === undefined ? undefined : input.internalNote,
      },
      select: USER_SUMMARY_SELECT,
    });
  }

  /**
   * Aggregate purchase stats for a customer's 360° profile. `orderCount` counts
   * every order the user has placed; the money figures only include paid-ish
   * orders (see PAIDISH_STATUSES). Decimals are returned as strings.
   */
  async getCustomerStats(id: string): Promise<CustomerStatsView> {
    await this.findByIdForAdmin(id);

    const [orderCount, paidAgg, lastOrder] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { userId: id } }),
      this.prisma.order.aggregate({
        where: { userId: id, status: { in: PAIDISH_STATUSES } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.order.findFirst({
        where: { userId: id, status: { in: PAIDISH_STATUSES } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const paidOrderCount = paidAgg._count;
    const totalSpent = paidAgg._sum.totalAmount ?? new Prisma.Decimal(0);
    const avgOrderValue =
      paidOrderCount > 0 ? totalSpent.dividedBy(paidOrderCount) : new Prisma.Decimal(0);

    return {
      orderCount,
      paidOrderCount,
      totalSpent: totalSpent.toString(),
      avgOrderValue: avgOrderValue.toString(),
      lastOrderAt: lastOrder?.createdAt.toISOString() ?? null,
    };
  }

  /**
   * Replace the user's role assignments atomically. Empty array clears roles.
   */
  async setRoles(userId: string, roleIds: string[]) {
    await this.findByIdForAdmin(userId);
    await this.assertRolesExist(roleIds);
    const unique = Array.from(new Set(roleIds));

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (unique.length > 0) {
        await tx.userRole.createMany({
          data: unique.map((roleId) => ({ userId, roleId })),
          skipDuplicates: true,
        });
      }
    });

    await this.permissions.invalidateUser(userId);
    return this.findByIdForAdmin(userId);
  }

  /**
   * Force-logout: revoke every active refresh token AND bump the user's session
   * epoch (`sessionsRevokedAt`). Bumping the epoch invalidates already-issued
   * access tokens immediately (JwtStrategy rejects tokens with `iat` at/before
   * it), so the user is kicked out now rather than only on next silent-refresh.
   */
  async revokeAllSessions(userId: string): Promise<{ count: number }> {
    await this.findByIdForAdmin(userId);
    const now = new Date();
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionsRevokedAt: now },
    });
    return { count: result.count };
  }

  async updateStatus(userId: string, status: UserStatus) {
    await this.findByIdForAdmin(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: USER_SUMMARY_SELECT,
    });
    // Suspended users should also lose their active sessions.
    if (status === 'SUSPENDED') await this.revokeAllSessions(userId);
    return updated;
  }

  private async assertRolesExist(roleIds: string[] | undefined) {
    if (!roleIds?.length) return;
    const unique = Array.from(new Set(roleIds));
    const found = await this.prisma.role.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException({
        code: 'UNKNOWN_ROLE',
        message: 'One or more roleIds do not exist',
      });
    }
  }
}
