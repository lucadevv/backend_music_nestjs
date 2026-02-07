import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Solo cachear GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    // Generar clave de caché basada en URL y query params
    const cacheKey = this.getCacheKey(request);
    
    // Intentar obtener del caché
    const cachedResponse = await this.cacheManager.get(cacheKey);
    
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Si no está en caché, ejecutar la petición y guardar resultado
    return next.handle().pipe(
      tap(async (response) => {
        // TTL por defecto: 5 minutos para contenido general
        // TTL más largo para contenido estático
        const ttl = this.getTtl(url);
        await this.cacheManager.set(cacheKey, response, ttl);
      }),
    );
  }

  private getCacheKey(request: any): string {
    const { url, query, user } = request;
    const queryString = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    
    // Incluir userId en la clave si el usuario está autenticado
    const userKey = user?.userId ? `:user:${user.userId}` : '';
    return `cache:${url}${queryString ? `?${queryString}` : ''}${userKey}`;
  }

  private getTtl(url: string): number {
    // TTL más largo para contenido que cambia poco
    if (url.includes('/explore') || url.includes('/categories') || url.includes('/genres')) {
      return 1800; // 30 minutos
    }
    
    // TTL más corto para contenido dinámico
    if (url.includes('/for-you') || url.includes('/recently-listened')) {
      return 300; // 5 minutos
    }

    // TTL por defecto
    return 600; // 10 minutos
  }
}
