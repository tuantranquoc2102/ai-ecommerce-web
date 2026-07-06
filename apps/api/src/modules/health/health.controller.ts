import { Controller, Get, HttpCode, HttpStatus, Inject, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { ENV_TOKEN, type AppEnv } from '../../config/env';

type CheckStatus = 'up' | 'down';

interface HealthResponse {
  status: CheckStatus;
  version: string;
  checks: Record<'db' | 'redis' | 's3', { status: CheckStatus; error?: string }>;
}

/**
 * Health probe for load balancers, Kubernetes livenessProbe/readinessProbe,
 * and uptime monitors. Bypasses auth + rate limiting. Always returns JSON;
 * the HTTP status code is what k8s and load balancers usually key on.
 *
 * - GET /api/v1/healthz/live  → cheap in-process check. "Am I running?"
 * - GET /api/v1/healthz       → full check of DB, Redis, and S3.
 *                                Returns 503 if any dependency is down so
 *                                k8s pulls the pod out of the LB pool.
 */
@Controller('healthz')
@Public()
@SkipThrottle()
export class HealthController {
  private readonly s3: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(ENV_TOKEN) private readonly env: AppEnv,
  ) {
    this.s3 = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }

  /** Liveness — pod is up and event loop is responsive. Never touches deps. */
  @Get('live')
  live(): { status: 'up' } {
    return { status: 'up' };
  }

  /** Readiness — every downstream dep is reachable. */
  @Get()
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<HealthResponse> {
    const [db, redis, s3] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
      this.checkS3(),
    ]);
    const status: CheckStatus =
      db.status === 'up' && redis.status === 'up' && s3.status === 'up' ? 'up' : 'down';
    const body: HealthResponse = {
      status,
      version: process.env.APP_VERSION ?? 'dev',
      checks: { db, redis, s3 },
    };
    if (status === 'down') {
      // 503 tells k8s / load balancers to drain the pod without treating
      // this as an application error. Dep info is surfaced in `details` so
      // ops has the failing subsystem at a glance.
      throw new ServiceUnavailableException({
        code: 'UNHEALTHY',
        message: 'One or more dependencies are unavailable',
        details: body.checks,
      });
    }
    return body;
  }

  private async checkDb(): Promise<{ status: CheckStatus; error?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch (e) {
      return { status: 'down', error: (e as Error).message };
    }
  }

  private async checkRedis(): Promise<{ status: CheckStatus; error?: string }> {
    try {
      const pong = await this.redis.client.ping();
      return pong === 'PONG' ? { status: 'up' } : { status: 'down', error: `unexpected reply: ${pong}` };
    } catch (e) {
      return { status: 'down', error: (e as Error).message };
    }
  }

  private async checkS3(): Promise<{ status: CheckStatus; error?: string }> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.env.S3_BUCKET }));
      return { status: 'up' };
    } catch (e) {
      return { status: 'down', error: (e as Error).message };
    }
  }
}
