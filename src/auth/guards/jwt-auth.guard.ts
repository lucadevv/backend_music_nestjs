import {
  Injectable,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Para endpoints públicos, intentar validar el token opcionalmente
      // pero no fallar si no hay token
      const request = context.switchToHttp().getRequest();
      const token = this.extractTokenFromHeader(request);

      if (token) {
        // Si hay token, intentar validarlo
        // Si falla, permitir acceso sin usuario (endpoint público)
        const result = super.canActivate(context);
        if (result instanceof Promise) {
          return result.catch(() => true) as Promise<boolean>;
        }
        return result;
      }

      // Si no hay token, permitir acceso sin autenticación
      return true;
    }

    // Para endpoints protegidos, requerir autenticación válida
    return super.canActivate(context);
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] =
      request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
