import { registerAs } from '@nestjs/config';

export const oauthConfig = registerAs('oauth', () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientIdAndroid: process.env.GOOGLE_CLIENT_ID_ANDROID || '',
    clientIdIos: process.env.GOOGLE_CLIENT_ID_IOS || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || '',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    privateKey: process.env.APPLE_PRIVATE_KEY || '',
    callbackURL: process.env.APPLE_CALLBACK_URL || '/api/auth/apple/callback',
  },
}));
