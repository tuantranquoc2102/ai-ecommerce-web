import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
