import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@ecom/shared';

export const REQUIRE_PERMISSION_KEY = 'authz:require-permission';

export type PermissionRequirement = {
  codes: string[];
  mode: 'ALL' | 'ANY';
};

/**
 * Mark a route or controller as requiring permission code(s).
 * `mode: 'ANY'` (default) — user must hold at least one of the codes.
 * `mode: 'ALL'` — user must hold every code in the list.
 */
export const RequirePermission = (
  ...codes: Array<PermissionCode | string>
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_PERMISSION_KEY, { codes, mode: 'ANY' } satisfies PermissionRequirement);

export const RequireAllPermissions = (
  ...codes: Array<PermissionCode | string>
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_PERMISSION_KEY, { codes, mode: 'ALL' } satisfies PermissionRequirement);
