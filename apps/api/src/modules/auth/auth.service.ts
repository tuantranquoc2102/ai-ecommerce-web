import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import type { LoginResult, AuthUserView } from '@ecom/shared';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { OtpService } from './otp.service';
import { PasswordResetService } from './password-reset.service';
import { TwoFactorService } from './two-factor.service';
import { RedisService } from '../../common/redis/redis.service';
import { PermissionsService } from '../authz/permissions.service';

const TWO_FA_TICKET_TTL = 300;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly resets: PasswordResetService,
    private readonly twoFa: TwoFactorService,
    private readonly redis: RedisService,
    private readonly permissions: PermissionsService,
  ) {}

  async register(input: { email: string; password: string; firstName?: string; lastName?: string }) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
    }
    const user = await this.users.createWithPassword(input);
    await this.users.assignRoleByCode(user.id, 'CUSTOMER');
    await this.permissions.invalidateAll();
    return user;
  }

  async login(
    input: { email: string; password: string },
    ctx: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<LoginResult> {
    const user = await this.users.findByEmail(input.email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }
    const ok = await this.users.verifyPassword(user, input.password);
    if (!ok) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    if (user.twoFactorEnabled) {
      const ticket = crypto.randomBytes(32).toString('base64url');
      await this.redis.setEx(`2fa:ticket:${ticket}`, TWO_FA_TICKET_TTL, user.id);
      return { stage: 'TWO_FACTOR_REQUIRED', ticket };
    }

    const tokens = await this.tokens.issuePair(user, ctx);
    const view = await this.buildAuthUserView(user.id);
    return { stage: 'COMPLETE', tokens, user: view };
  }

  async verifyTwoFactor(
    ticket: string,
    code: string,
    ctx: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<LoginResult> {
    const key = `2fa:ticket:${ticket}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      throw new UnauthorizedException({ code: '2FA_TICKET_INVALID', message: '2FA ticket expired' });
    }
    const user = await this.users.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException({ code: '2FA_NOT_CONFIGURED', message: '2FA is not configured' });
    }
    const passed = this.twoFa.verifyCode(user.twoFactorSecret, code)
      || (await this.twoFa.consumeRecoveryCode(user.id, code));
    if (!passed) {
      throw new UnauthorizedException({ code: '2FA_INVALID', message: 'Invalid 2FA code' });
    }
    await this.redis.del(key);
    const tokens = await this.tokens.issuePair(user, ctx);
    const view = await this.buildAuthUserView(user.id);
    return { stage: 'COMPLETE', tokens, user: view };
  }

  async refresh(refreshToken: string, ctx: { userAgent?: string; ipAddress?: string } = {}) {
    return this.tokens.rotateRefresh(refreshToken, ctx);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  async requestOtp(identifier: string, channel: 'EMAIL' | 'SMS') {
    return this.otp.request(identifier, channel);
  }

  async verifyOtp(
    identifier: string,
    code: string,
    ctx: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<LoginResult> {
    await this.otp.verify(identifier, code);
    let user = await this.users.findByEmail(identifier);
    if (!user) {
      user = await this.users.createPasswordless(identifier);
      await this.users.assignRoleByCode(user.id, 'CUSTOMER');
      await this.permissions.invalidateAll();
    }
    const tokens = await this.tokens.issuePair(user, ctx);
    const view = await this.buildAuthUserView(user.id);
    return { stage: 'COMPLETE', tokens, user: view };
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.resets.request(email);
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException({ code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' });
    }
    await this.resets.confirm(token, newPassword);
  }

  async oauthLogin(
    provider: 'google' | 'facebook',
    profile: { providerUserId: string; email: string; firstName?: string; lastName?: string },
    ctx: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<{ tokens: ReturnType<TokenService['issuePair']> extends Promise<infer R> ? R : never; user: AuthUserView }> {
    const user = await this.users.findOrCreateFromOAuth({ provider, ...profile });
    await this.users.assignRoleByCode(user.id, 'CUSTOMER');
    const tokens = await this.tokens.issuePair(user, ctx);
    const view = await this.buildAuthUserView(user.id);
    return { tokens, user: view };
  }

  async buildAuthUserView(userId: string): Promise<AuthUserView> {
    const u = await this.users.findByIdWithRoles(userId);
    if (!u) throw new UnauthorizedException();
    const codes = await this.permissions.getUserPermissionCodes(userId);
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      roles: u.userRoles.map((ur) => ur.role.code),
      permissions: codes,
    };
  }
}
