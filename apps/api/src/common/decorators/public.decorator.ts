import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_KEY = 'auth:public';
/** Route is fully public — skip authentication entirely (no `req.user`). */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLIC_ROUTE_KEY, true);

export const OPTIONAL_AUTH_KEY = 'auth:optional';
/**
 * Route accepts both authenticated and unauthenticated requests. If a valid
 * `Authorization: Bearer` is present, `req.user` is populated; otherwise it's
 * `undefined` and the request proceeds. Use for storefront endpoints that
 * behave differently for guest vs. logged-in callers (e.g. checkout, cart).
 */
export const OptionalAuth = (): MethodDecorator & ClassDecorator =>
  SetMetadata(OPTIONAL_AUTH_KEY, true);
