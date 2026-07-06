import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../common/redis/redis.service';
import { MailService } from '../../common/mail/mail.service';
import { ENV_TOKEN, AppEnv } from '../../config/env';
import { UsersService } from '../users/users.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly users: UsersService,
    private readonly mail: MailService,
    @Inject(ENV_TOKEN) private readonly env: AppEnv,
  ) {}

  async request(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      // Don't leak existence — silently succeed. The response the caller sees
      // is identical whether or not the address is registered.
      return;
    }
    const token = crypto.randomBytes(32).toString('base64url');
    const key = `pwreset:${this.hash(token)}`;
    await this.redis.setEx(key, this.env.PASSWORD_RESET_TTL_SECONDS, user.id);

    const resetUrl = `${this.env.FRONTEND_URL}/reset-password?token=${token}`;

    // Fire-and-forget: the reset token is already in Redis, so a mail
    // failure doesn't invalidate the request. Users will get a 204 even if
    // delivery fails; ops sees the failure in the log.
    this.mail
      .sendPasswordReset({
        to: user.email,
        resetUrl,
        ttlSeconds: this.env.PASSWORD_RESET_TTL_SECONDS,
      })
      .catch((e) =>
        this.logger.error(`Failed to send password-reset mail to ${email}: ${(e as Error).message}`),
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
