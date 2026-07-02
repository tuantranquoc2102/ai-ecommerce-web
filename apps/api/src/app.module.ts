import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EnvModule } from './config/env.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
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
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/authz/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ScheduleModule.forRoot(),
    EnvModule,
    PrismaModule,
    RedisModule,
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
