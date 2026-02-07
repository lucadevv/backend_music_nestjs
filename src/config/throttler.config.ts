import { registerAs } from '@nestjs/config';

export const throttlerConfig = registerAs('throttler', () => ({
  ttl: parseInt(process.env.THROTTLER_TTL || '60', 10), // 60 segundos
  limit: parseInt(process.env.THROTTLER_LIMIT || '100', 10), // 100 requests por minuto
}));
