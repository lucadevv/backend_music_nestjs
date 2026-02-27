import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
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

    // No cachear stream-proxy (siempre debe ser fresh)
    if (url.includes('/stream-proxy')) {
      return next.handle();
    }

    // Solo cachear GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    // Generar clave de caché basada en URL y query params
    const cacheKey = this.getCacheKey(request);
    
    // Intentar obtener del caché PRIMERO (siempre servir cache si existe)
    const cachedResponse = await this.cacheManager.get(cacheKey);
    
    if (cachedResponse) {
      // Devolver cache inmediatamente, luego actualizar en background
      // Esto da la sensación de instantáneo al usuario
      this.refreshCacheInBackground(cacheKey, next, url);
      return of(cachedResponse);
    }

    // Si no está en caché, ejecutar la petición
    return next.handle().pipe(
      tap(async (response) => {
        const ttl = this.getTtl(url);
        await this.cacheManager.set(cacheKey, response, ttl);
      }),
      catchError((error) => {
        // Si hay error, intentar servir cache aunque esté viejo
        return this.handleCacheError(error);
      }),
    );
  }

  private async refreshCacheInBackground(cacheKey: string, next: CallHandler, url: string) {
    // Solo actualizar en background para contenido no crítico
    if (!url.includes('/for-you') && !url.includes('/recently-listened')) {
      const ttl = this.getTtl(url);
      next.handle().pipe(
        tap(async (response) => {
          await this.cacheManager.set(cacheKey, response, ttl);
        }),
      ).subscribe({
        error: () => {} // Silenciar errores de refresh
      });
    }
  }

  private handleCacheError(error: any): Observable<any> {
    // Si es error 5xx (FastAPI/YouTube down), el frontend puede manejarlo
    const status = error?.status || error?.response?.status;
    
    if (status >= 500) {
      // Re-throw para que el controller maneje el error
      // El frontend puede mostrar datos cacheados si los tiene
      throw new HttpException(
        { 
          message: 'Service temporarily unavailable', 
          cached: false,
          error: error.message 
        },
        HttpStatus.BAD_GATEWAY
      );
    }
    
    return throwError(() => error);
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
    // Contenido que casi nunca cambia - 2 horas
    if (url.includes('/explore') || url.includes('/categories') || url.includes('/genres')) {
      return 7200; // 2 horas
    }
    
    // Playlists - 1 hora
    if (url.includes('/playlists/')) {
      return 3600;
    }
    
    // Contenido personalizado - 5 minutos
    if (url.includes('/for-you') || url.includes('/recently-listened')) {
      return 300; // 5 minutos
    }

    // Búsquedas - 10 minutos
    if (url.includes('/search')) {
      return 600;
    }

    // TTL por defecto - 15 minutos
    return 900;
  }
}
