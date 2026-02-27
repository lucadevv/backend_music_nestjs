import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified?: boolean }>;
  name?: { givenName?: string; familyName?: string };
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('oauth.google.clientId') || '',
      clientSecret: configService.get<string>('oauth.google.clientSecret') || '',
      callbackURL: configService.get<string>('oauth.google.callbackURL') || '/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const result = await this.authService.loginWithGoogle(profile);
      done(null, result);
    } catch (error) {
      done(error as Error, false);
    }
  }
}
