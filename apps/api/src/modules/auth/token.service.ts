import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { ENV_TOKEN, AppEnv } from '../../config/env';
import { PrismaService } from '../../common/prisma/prisma.service';

export type JwtPayload = {
  sub: string;
  email: string;
  type: 'access';
};

export type IssueOptions = {
  userAgent?: string;
  ipAddress?: string;
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Inject(ENV_TOKEN) private readonly env: AppEnv,
  ) {}

  async issuePair(user: { id: string; email: string }, opts: IssueOptions = {}) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, type: 'access' } satisfies JwtPayload,
      { secret: this.env.JWT_ACCESS_SECRET, expiresIn: this.env.JWT_ACCESS_TTL },
    );

    const refreshToken = this.generateOpaqueToken();
    const tokenHash = this.hash(refreshToken);
    const expiresAt = this.parseTtlToDate(this.env.JWT_REFRESH_TTL);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: opts.userAgent ?? null,
        ipAddress: opts.ipAddress ?? null,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer' as const,
      expiresIn: this.parseTtlToSeconds(this.env.JWT_ACCESS_TTL),
    };
  }

  async rotateRefresh(refreshToken: string, opts: IssueOptions = {}) {
    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issuePair({ id: stored.user.id, email: stored.user.email }, opts);
  }

  async revoke(refreshToken: string): Promise<void> {
    const tokenHash = this.hash(refreshToken);
    await this.prisma.refreshToken
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  generateOpaqueToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private parseTtlToSeconds(ttl: string): number {
    const m = ttl.match(/^(\d+)([smhd])$/);
    if (!m) return Number(ttl);
    const n = Number(m[1]);
    switch (m[2]) {
      case 's': return n;
      case 'm': return n * 60;
      case 'h': return n * 60 * 60;
      case 'd': return n * 60 * 60 * 24;
      default:  return n;
    }
  }

  private parseTtlToDate(ttl: string): Date {
    return new Date(Date.now() + this.parseTtlToSeconds(ttl) * 1000);
  }
}
