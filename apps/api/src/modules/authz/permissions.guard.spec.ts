import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';
import { REQUIRE_PERMISSION_KEY } from '../../common/decorators/require-permission.decorator';
import { PUBLIC_ROUTE_KEY } from '../../common/decorators/public.decorator';

type MockedPermissionsService = Pick<
  PermissionsService,
  'userHasAnyPermission' | 'userHasAllPermissions'
>;

function makeContext(opts: {
  user?: { id: string; email: string; roles: string[] } | undefined;
  metadata: Map<string, unknown>;
}): { ctx: ExecutionContext; reflector: Reflector } {
  const handler = {};
  const cls = {};
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => opts.metadata.get(key)),
  } as unknown as Reflector;

  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ user: opts.user }),
    }),
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;

  return { ctx, reflector };
}

function makeGuard(reflector: Reflector, perms: MockedPermissionsService): PermissionsGuard {
  return new PermissionsGuard(reflector, perms as unknown as PermissionsService);
}

describe('PermissionsGuard', () => {
  it('allows public routes without checks', async () => {
    const meta = new Map<string, unknown>([[PUBLIC_ROUTE_KEY, true]]);
    const { ctx, reflector } = makeContext({ metadata: meta });
    const perms = {
      userHasAnyPermission: jest.fn(),
      userHasAllPermissions: jest.fn(),
    };
    const guard = makeGuard(reflector, perms);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(perms.userHasAnyPermission).not.toHaveBeenCalled();
    expect(perms.userHasAllPermissions).not.toHaveBeenCalled();
  });

  it('allows routes with no permission metadata', async () => {
    const meta = new Map<string, unknown>();
    const { ctx, reflector } = makeContext({
      user: { id: 'u1', email: 'a@b.c', roles: ['CUSTOMER'] },
      metadata: meta,
    });
    const perms = {
      userHasAnyPermission: jest.fn(),
      userHasAllPermissions: jest.fn(),
    };
    const guard = makeGuard(reflector, perms);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(perms.userHasAnyPermission).not.toHaveBeenCalled();
  });

  it('allows routes whose required codes list is empty', async () => {
    const meta = new Map<string, unknown>([[REQUIRE_PERMISSION_KEY, { codes: [], mode: 'ANY' }]]);
    const { ctx, reflector } = makeContext({
      user: { id: 'u1', email: 'a@b.c', roles: [] },
      metadata: meta,
    });
    const perms = {
      userHasAnyPermission: jest.fn(),
      userHasAllPermissions: jest.fn(),
    };
    const guard = makeGuard(reflector, perms);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws Forbidden when user is missing on a protected route', async () => {
    const meta = new Map<string, unknown>([
      [REQUIRE_PERMISSION_KEY, { codes: ['product.create'], mode: 'ANY' }],
    ]);
    const { ctx, reflector } = makeContext({ metadata: meta });
    const perms = {
      userHasAnyPermission: jest.fn(),
      userHasAllPermissions: jest.fn(),
    };
    const guard = makeGuard(reflector, perms);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ANY mode: allows if user has at least one code', async () => {
    const meta = new Map<string, unknown>([
      [REQUIRE_PERMISSION_KEY, { codes: ['product.create', 'product.update'], mode: 'ANY' }],
    ]);
    const { ctx, reflector } = makeContext({
      user: { id: 'u1', email: 'a@b.c', roles: ['ADMIN'] },
      metadata: meta,
    });
    const perms = {
      userHasAnyPermission: jest.fn().mockResolvedValue(true),
      userHasAllPermissions: jest.fn(),
    };
    const guard = makeGuard(reflector, perms);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(perms.userHasAnyPermission).toHaveBeenCalledWith('u1', ['product.create', 'product.update']);
    expect(perms.userHasAllPermissions).not.toHaveBeenCalled();
  });

  it('ANY mode: throws Forbidden when user holds none of the codes', async () => {
    const meta = new Map<string, unknown>([
      [REQUIRE_PERMISSION_KEY, { codes: ['product.create'], mode: 'ANY' }],
    ]);
    const { ctx, reflector } = makeContext({
      user: { id: 'u1', email: 'a@b.c', roles: ['CUSTOMER'] },
      metadata: meta,
    });
    const perms = {
      userHasAnyPermission: jest.fn().mockResolvedValue(false),
      userHasAllPermissions: jest.fn(),
    };
    const guard = makeGuard(reflector, perms);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ALL mode: routes to userHasAllPermissions', async () => {
    const meta = new Map<string, unknown>([
      [REQUIRE_PERMISSION_KEY, { codes: ['order.read', 'order.refund'], mode: 'ALL' }],
    ]);
    const { ctx, reflector } = makeContext({
      user: { id: 'u1', email: 'a@b.c', roles: ['ADMIN'] },
      metadata: meta,
    });
    const perms = {
      userHasAnyPermission: jest.fn(),
      userHasAllPermissions: jest.fn().mockResolvedValue(true),
    };
    const guard = makeGuard(reflector, perms);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(perms.userHasAllPermissions).toHaveBeenCalledWith('u1', ['order.read', 'order.refund']);
    expect(perms.userHasAnyPermission).not.toHaveBeenCalled();
  });

  it('ALL mode: throws Forbidden when user is missing any code', async () => {
    const meta = new Map<string, unknown>([
      [REQUIRE_PERMISSION_KEY, { codes: ['order.read', 'order.refund'], mode: 'ALL' }],
    ]);
    const { ctx, reflector } = makeContext({
      user: { id: 'u1', email: 'a@b.c', roles: ['EDITOR'] },
      metadata: meta,
    });
    const perms = {
      userHasAnyPermission: jest.fn(),
      userHasAllPermissions: jest.fn().mockResolvedValue(false),
    };
    const guard = makeGuard(reflector, perms);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('error message includes the requested codes', async () => {
    const meta = new Map<string, unknown>([
      [REQUIRE_PERMISSION_KEY, { codes: ['banner.write', 'page.write'], mode: 'ANY' }],
    ]);
    const { ctx, reflector } = makeContext({
      user: { id: 'u1', email: 'a@b.c', roles: [] },
      metadata: meta,
    });
    const perms = {
      userHasAnyPermission: jest.fn().mockResolvedValue(false),
      userHasAllPermissions: jest.fn(),
    };
    const guard = makeGuard(reflector, perms);
    await expect(guard.canActivate(ctx)).rejects.toThrow(/banner\.write OR page\.write/);
  });
});
