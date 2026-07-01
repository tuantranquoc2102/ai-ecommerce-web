import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_PERMISSION_KEY,
  type PermissionRequirement,
} from '../../common/decorators/require-permission.decorator';
import { PUBLIC_ROUTE_KEY } from '../../common/decorators/public.decorator';
import { PermissionsService } from './permissions.service';
import type { RequestUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [context.getHandler(), context.getClass()])) {
      return true;
    }

    const req = this.reflector.getAllAndOverride<PermissionRequirement>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!req || !req.codes.length) return true;

    const user = context.switchToHttp().getRequest<{ user?: RequestUser }>().user;
    if (!user) {
      throw new ForbiddenException({ code: 'NOT_AUTHENTICATED', message: 'Authentication required' });
    }

    const ok =
      req.mode === 'ALL'
        ? await this.permissions.userHasAllPermissions(user.id, req.codes)
        : await this.permissions.userHasAnyPermission(user.id, req.codes);

    if (!ok) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: `Requires permission: ${req.codes.join(req.mode === 'ALL' ? ' AND ' : ' OR ')}`,
      });
    }
    return true;
  }
}
