import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RedisService } from '../../common/redis/redis.service';

const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h

/**
 * Short-lived tokens attached to guest confirmation URLs so a shopper without
 * an account can view their order at /orders/[orderNumber]?token=xxx without
 * exposing the order to anyone who guesses the number. Auth'd customers can
 * look up their own orders directly and don't need a token.
 */
@Injectable()
export class OrderTokensService {
  constructor(private readonly redis: RedisService) {}

  async issue(orderNumber: string): Promise<string> {
    const token = randomBytes(24).toString('base64url');
    await this.redis.setEx(this.key(orderNumber), TOKEN_TTL_SECONDS, token);
    return token;
  }

  async verify(orderNumber: string, token: string): Promise<boolean> {
    if (!token) return false;
    const stored = await this.redis.get(this.key(orderNumber));
    return stored !== null && stored === token;
  }

  private key(orderNumber: string): string {
    return `order:token:${orderNumber}`;
  }
}
