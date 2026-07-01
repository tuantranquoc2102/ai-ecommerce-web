import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type StrategyOptions } from 'passport-google-oauth20';
import { ENV_TOKEN, AppEnv } from '../../../config/env';

export type OAuthProfile = {
  providerUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(ENV_TOKEN) env: AppEnv) {
    super({
      clientID: env.GOOGLE_CLIENT_ID || 'unset',
      clientSecret: env.GOOGLE_CLIENT_SECRET || 'unset',
      callbackURL: env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/oauth/google/callback',
      scope: ['email', 'profile'],
    } satisfies StrategyOptions);
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    const email = profile.emails?.[0]?.value;
    if (!email) throw new Error('Google profile is missing an email');
    return {
      providerUserId: profile.id,
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}
