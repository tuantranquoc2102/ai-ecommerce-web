import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../common/redis/redis.service';
import { ENV_TOKEN, AppEnv } from '../../config/env';

class Throttled extends HttpException {
  constructor(message = 'Too many attempts') {
    super({ message, code: 'TOO_MANY_REQUESTS' }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly redis: RedisService,
    @Inject(ENV_TOKEN) private readonly env: AppEnv,
  ) {}

  async request(identifier: string, channel: 'EMAIL' | 'SMS'): Promise<{ ttl: number }> {
    const norm = this.normalize(identifier);
    const cooldownKey = `otp:cooldown:${norm}`;
    if (await this.redis.get(cooldownKey)) {
      throw new Throttled('Please wait before requesting another OTP');
    }
    const code = this.generateNumericCode(6);
    const payload = JSON.stringify({ code, attempts: 0, channel });
    await this.redis.setEx(`otp:${norm}`, this.env.OTP_TTL_SECONDS, payload);
    await this.redis.setEx(cooldownKey, 60, '1');

    // Real implementation would call an email/SMS gateway here.
    this.logger.warn(`[DEV-ONLY] OTP for ${norm} (${channel}): ${code}`);

    return { ttl: this.env.OTP_TTL_SECONDS };
  }

  async verify(identifier: string, candidate: string): Promise<boolean> {
    const norm = this.normalize(identifier);
    const key = `otp:${norm}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new BadRequestException({ code: 'OTP_EXPIRED', message: 'OTP expired or not requested' });

    const data = JSON.parse(raw) as { code: string; attempts: number; channel: string };
    if (data.attempts >= this.env.OTP_MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new Throttled('OTP locked due to too many attempts');
    }
    if (!this.constantTimeEqual(data.code, candidate)) {
      data.attempts += 1;
      await this.redis.setEx(key, this.env.OTP_TTL_SECONDS, JSON.stringify(data));
      throw new BadRequestException({ code: 'OTP_INVALID', message: 'Invalid OTP' });
    }
    await this.redis.del(key);
    return true;
  }

  private normalize(identifier: string): string {
    return identifier.trim().toLowerCase();
  }

  private generateNumericCode(length: number): string {
    let out = '';
    while (out.length < length) {
      const byte = crypto.randomBytes(1)[0]!;
      if (byte < 250) out += (byte % 10).toString();
    }
    return out;
  }

  private constantTimeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
