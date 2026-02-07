import * as Joi from 'joi';

export const validationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3000),
    API_PREFIX: Joi.string().default('api'),

    // Database configuration (PostgreSQL)
    DB_HOST: Joi.string().default('localhost'),
    DB_PORT: Joi.number().default(5432),
    DB_USERNAME: Joi.string().default('postgres'),
    DB_PASSWORD: Joi.string().default('postgres'),
    DB_NAME: Joi.string().default('music_app'),
    DATABASE_URI: Joi.string().allow('').optional(),

    // Redis configuration
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow('').optional(),
    REDIS_TTL: Joi.number().default(3600),
    REDIS_URL: Joi.string().allow('').optional(),

    // JWT configuration
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
    JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
    JWT_ISSUER: Joi.string().default('music_app'),
    JWT_AUDIENCE: Joi.string().default('music_app'),

    // OAuth Google
    GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
    GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
    GOOGLE_CALLBACK_URL: Joi.string().default('/api/auth/google/callback'),

    // OAuth Apple
    APPLE_CLIENT_ID: Joi.string().allow('').optional(),
    APPLE_TEAM_ID: Joi.string().allow('').optional(),
    APPLE_KEY_ID: Joi.string().allow('').optional(),
    APPLE_PRIVATE_KEY: Joi.string().allow('').optional(),
    APPLE_CALLBACK_URL: Joi.string().default('/api/auth/apple/callback'),

    // External Music Service
    MUSIC_SERVICE_BASE_URL: Joi.string().uri().default('http://localhost:8000/api/v1'),
    MUSIC_SERVICE_TIMEOUT: Joi.number().default(30000),

    // Throttler (Rate Limiting)
    THROTTLER_TTL: Joi.number().default(60),
    THROTTLER_LIMIT: Joi.number().default(100),
});
