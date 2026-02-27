import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientId = configService.get<string>('oauth.apple.clientId') || '';
    const teamId = configService.get<string>('oauth.apple.teamId') || '';
    const keyId = configService.get<string>('oauth.apple.keyId') || '';
    const callbackURL = configService.get<string>('oauth.apple.callbackURL') || '/api/auth/apple/callback';

    // passport-apple requires keyFilePath, not privateKey directly
    // For now, we'll use a type assertion to bypass the typing issue
    // In production, you should save the private key to a file and use keyFilePath
    super({
      clientID: clientId,
      teamID: teamId,
      keyID: keyId,
      callbackURL,
      scope: ['email', 'name'],
    } as any);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    idToken: string,
    profile: unknown,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      // Apple returns user info in idToken, parse it
      const decoded = JSON.parse(
        Buffer.from(idToken.split('.')[1], 'base64').toString(),
      );

      const profileObj = profile as { name?: { firstName?: string; lastName?: string } };

      const appleProfile = {
        id: decoded.sub,
        email: decoded.email,
        name: profileObj?.name || decoded.name,
      };

      const result = await this.authService.loginWithApple(appleProfile);
      done(null, result);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
