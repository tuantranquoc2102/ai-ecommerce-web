import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV_TOKEN, AppEnv } from '../../config/env';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor(@Inject(ENV_TOKEN) env: AppEnv) {
    this.client = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async onModuleInit(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'end') {
      await this.client.connect();
    }
    await this.client.ping();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  /**
   * Idempotency primitive. Sets the key only if it does not already exist,
   * with the given TTL. Returns `true` when this call claimed the key
   * (caller should proceed with the side effect), `false` when someone else
   * has already claimed it (caller should short-circuit and return the
   * cached result stored under `key`).
   */
  async setNxEx(key: string, ttlSeconds: number, value: string): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(...keys: string[]): Promise<number> {
    if (!keys.length) return 0;
    return this.client.del(keys);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }
}
