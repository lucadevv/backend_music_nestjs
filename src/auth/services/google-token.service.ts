import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

export interface GoogleTokenInfo {
  email: string;
  emailVerified: boolean;
  sub: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

@Injectable()
export class GoogleTokenService {
  private readonly logger = new Logger(GoogleTokenService.name);
  private readonly oauth2Client: OAuth2Client;
  private readonly audiences: string[];

  constructor(private readonly configService: ConfigService) {
    const webClientId = this.configService.get<string>('oauth.google.clientId') || '';
    const androidClientId = this.configService.get<string>('oauth.google.clientIdAndroid') || '';
    const iosClientId = this.configService.get<string>('oauth.google.clientIdIos') || '';

    this.audiences = [
      webClientId,
      androidClientId,
      iosClientId,
    ].filter(id => id.length > 0);

    this.oauth2Client = new OAuth2Client(webClientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleTokenInfo> {
    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken,
        audience: this.audiences,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google ID token payload');
      }

      return {
        email: payload.email!,
        emailVerified: payload.email_verified ?? false,
        sub: payload.sub,
        givenName: payload.given_name,
        familyName: payload.family_name,
        picture: payload.picture,
      };
    } catch (error) {
      this.logger.error(`Failed to verify Google ID token: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException('Invalid Google ID token');
    }
  }

  async verifyAccessToken(accessToken: string): Promise<GoogleTokenInfo> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`,
      );

      if (!response.ok) {
        this.logger.error(`Failed to verify Google access token: ${response.status}`);
        throw new UnauthorizedException('Invalid Google access token');
      }

      const data = await response.json();

      if (!data.email) {
        throw new UnauthorizedException('Google access token does not contain email');
      }

      return {
        email: data.email,
        emailVerified: data.verified_email ?? false,
        sub: data.id,
        givenName: data.given_name,
        familyName: data.family_name,
        picture: data.picture,
      };
    } catch (error) {
      this.logger.error(`Failed to verify Google access token: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException('Invalid Google access token');
    }
  }

  async verifyToken(idToken?: string, accessToken?: string): Promise<GoogleTokenInfo> {
    if (idToken) {
      return this.verifyIdToken(idToken);
    }
    
    if (accessToken) {
      return this.verifyAccessToken(accessToken);
    }

    throw new UnauthorizedException('No token provided for Google verification');
  }

  async fetchProfilePicture(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch(
        'https://people.googleapis.com/v1/people/me?personFields=photos',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        this.logger.warn(`Failed to fetch profile picture: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const photos = data.photos;
      if (photos && photos.length > 0) {
        return photos.find((p: { default?: boolean; url: string }) => p.default)?.url || photos[0].url;
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to fetch profile picture: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
