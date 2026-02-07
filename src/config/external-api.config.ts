import { registerAs } from '@nestjs/config';

export const externalApiConfig = registerAs('externalApi', () => ({
    musicServiceBaseUrl: process.env.MUSIC_SERVICE_BASE_URL || 'http://localhost:8000/api/v1',
    musicServiceTimeout: parseInt(process.env.MUSIC_SERVICE_TIMEOUT || '30000', 10),
}));
