import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../common/redis/redis.service';
import { ENV_TOKEN, AppEnv } from '../../config/env';
import { UsersService } from '../users/users.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly users: UsersService,
    @Inject(ENV_TOKEN) private readonly env: AppEnv,
  ) {}

  async request(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      // Don't leak existence — silently succeed.
      return;
    }
    const token = crypto.randomBytes(32).toString('base64url');
    const key = `pwreset:${this.hash(token)}`;
    await this.redis.setEx(key, this.env.PASSWORD_RESET_TTL_SECONDS, user.id);

    // Real implementation: send an email containing
    //   ${FRONTEND_URL}/reset-password?token=${token}
    this.logger.warn(
      `[DEV-ONLY] Password reset link for ${email}: ${this.env.FRONTEND_URL}/reset-password?token=${token}`,
    );
  }

  async confirm(token: string, newPassword: string): Promise<void> {
    const key = `pwreset:${this.hash(token)}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      throw new BadRequestException({ code: 'RESET_TOKEN_INVALID', message: 'Reset link expired or invalid' });
    }
    // Single-use: delete first, then mutate user.
    await this.redis.del(key);
    await this.users.updatePassword(userId, newPassword);
  }

  private hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
