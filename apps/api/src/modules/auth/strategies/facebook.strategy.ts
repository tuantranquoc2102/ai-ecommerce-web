import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-facebook';
import { ENV_TOKEN, AppEnv } from '../../../config/env';
import type { OAuthProfile } from './google.strategy';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(@Inject(ENV_TOKEN) env: AppEnv) {
    super({
      clientID: env.FACEBOOK_CLIENT_ID || 'unset',
      clientSecret: env.FACEBOOK_CLIENT_SECRET || 'unset',
      callbackURL: env.FACEBOOK_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/oauth/facebook/callback',
      profileFields: ['id', 'emails', 'name'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error('Facebook profile is missing an email — request email permission');
    return {
      providerUserId: profile.id,
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}
