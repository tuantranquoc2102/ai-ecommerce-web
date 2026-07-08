import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { LoggerModule } from 'nestjs-pino';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { EnvModule } from './config/env.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { MailModule } from './common/mail/mail.module';
import { ENV_TOKEN, type AppEnv } from './config/env';
import { AuthModule } from './modules/auth/auth.module';
import { AuthzModule } from './modules/authz/authz.module';
import { RolesModule } from './modules/roles/roles.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { UsersModule } from './modules/users/users.module';
import { TagsModule } from './modules/tags/tags.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { MediaModule } from './modules/media/media.module';
import { PagesModule } from './modules/pages/pages.module';
import { MenusModule } from './modules/menus/menus.module';
import { BannersModule } from './modules/banners/banners.module';
import { BlockTemplatesModule } from './modules/block-templates/block-templates.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SettingsModule } from './modules/settings/settings.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/authz/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ScheduleModule.forRoot(),
    // Structured logging via pino. Pretty output in development, JSON in
    // production (log aggregators expect single-line JSON). Every request
    // gets a UUID stored as `req.id` so downstream logs can be correlated.
    // Health-check noise is suppressed.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        autoLogging: {
          ignore: (req) => req.url?.startsWith('/api/v1/healthz') ?? false,
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.newPassword',
            'req.body.refreshToken',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  translateTime: 'HH:MM:ss.l',
                  ignore: 'pid,hostname,req.headers,res.headers',
                },
              },
      },
    }),
    EnvModule,
    PrismaModule,
    RedisModule,
    MailModule,
    // Rate limiting. One default bucket (100 req/min per IP) applies to
    // every request. Sensitive endpoints override this ceiling via
    // `@Throttle({ default: { ttl, limit } })` on the controller method —
    // that decorator REPLACES the default config for that route only, it
    // does not stack. Storage is Redis-backed so limits stay consistent
    // across API pods.
    ThrottlerModule.forRootAsync({
      inject: [ENV_TOKEN],
      useFactory: (env: AppEnv) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(
          new Redis(env.REDIS_URL, { keyPrefix: 'throttle:' }),
        ),
      }),
    }),
    AuthModule,
    AuthzModule,
    UsersModule,
    RolesModule,
    ResourcesModule,
    TagsModule,
    CategoriesModule,
    ProductsModule,
    MediaModule,
    PagesModule,
    MenusModule,
    BannersModule,
    BlockTemplatesModule,
    CouponsModule,
    PaymentsModule,
    OrdersModule,
    SettingsModule,
    HealthModule,
  ],
  providers: [
    // Order matters: ThrottlerGuard runs before JwtAuthGuard so bots hitting
    // /auth/login are rate-limited without paying for a JWT lookup first.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
