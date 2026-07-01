import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV_TOKEN, AppEnv } from '../../../config/env';
import { UsersService } from '../../users/users.service';
import type { JwtPayload } from '../token.service';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(ENV_TOKEN) env: AppEnv,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN_TYPE' });
    }
    const u = await this.users.findByIdWithRoles(payload.sub);
    if (!u || u.status !== 'ACTIVE') {
      throw new UnauthorizedException({ code: 'USER_INACTIVE' });
    }
    return {
      id: u.id,
      email: u.email,
      roles: u.userRoles.map((ur) => ur.role.code),
    };
  }
}
