import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

const CACHE_VERSION_KEY = 'cache:permissions:version';
const USER_CACHE_PREFIX = 'cache:permissions:user:';
const USER_CACHE_TTL_SECONDS = 60 * 60; // 1h hard cap, version check still applies

type CachedEntry = { v: string; codes: string[] };

/**
 * Dynamic permission lookup with Redis-backed caching.
 *
 * Cache strategy:
 *  - `cache:permissions:version` is a monotonically-incrementing version key.
 *  - Per-user entries store `{ v, codes }`. On read, if the entry's `v` is stale,
 *    we refresh from DB. On any role/permission/role-permission change, `invalidateAll()`
 *    is called which `INCR`s the version key — every subsequent read sees a mismatch
 *    and refreshes. This satisfies the spec's "DEL cache:permissions:all" requirement
 *    with O(1) cost instead of SCAN-and-delete.
 */
@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async userHasAnyPermission(userId: string, requiredCodes: string[]): Promise<boolean> {
    if (!requiredCodes.length) return true;
    const owned = await this.getUserPermissionCodes(userId);
    return requiredCodes.some((c) => owned.includes(c));
  }

  async userHasAllPermissions(userId: string, requiredCodes: string[]): Promise<boolean> {
    if (!requiredCodes.length) return true;
    const owned = new Set(await this.getUserPermissionCodes(userId));
    return requiredCodes.every((c) => owned.has(c));
  }

  async getUserPermissionCodes(userId: string): Promise<string[]> {
    const version = await this.getVersion();
    const cacheKey = USER_CACHE_PREFIX + userId;
    const raw = await this.redis.get(cacheKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CachedEntry;
        if (parsed.v === version) return parsed.codes;
      } catch {
        // fall through to refresh
      }
    }
    const codes = await this.loadFromDb(userId);
    await this.redis.setEx(cacheKey, USER_CACHE_TTL_SECONDS, JSON.stringify({ v: version, codes } satisfies CachedEntry));
    return codes;
  }

  async invalidateAll(): Promise<void> {
    const v = await this.redis.incr(CACHE_VERSION_KEY);
    this.logger.log(`Authz cache flushed (version = ${v})`);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.redis.del(USER_CACHE_PREFIX + userId);
  }

  private async loadFromDb(userId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ code: string }>>`
      SELECT DISTINCT p."code"
      FROM "Permission" p
      JOIN "RolePermission" rp ON rp."permissionId" = p."id"
      JOIN "UserRole" ur ON ur."roleId" = rp."roleId"
      WHERE ur."userId" = ${userId}
    `;
    return rows.map((r) => r.code);
  }

  private async getVersion(): Promise<string> {
    const v = await this.redis.get(CACHE_VERSION_KEY);
    if (v) return v;
    const initial = await this.redis.incr(CACHE_VERSION_KEY);
    return initial.toString();
  }
}
