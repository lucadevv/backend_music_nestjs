import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api',
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
    url: process.env.APP_URL || 'http://localhost:3000',
}));
