import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = {
  id: string;
  email: string;
  roles: string[];
};

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | unknown => {
    const req = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = req.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
