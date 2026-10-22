import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { AuthService } from '../auth/auth.service';
import { IS_PUBLIC } from './public.decorator';

/**
 * Accepts, in order: (1) a signed session token from POST /auth/login,
 * (2) the optional static APP_API_KEY (for scripts/automation).
 * Fails closed in production. Development with nothing configured is open (a warning is logged by AuthService).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private cfg: ConfigService, private auth: AuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const header: string = ctx.switchToHttp().getRequest().headers['authorization'] ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (token && this.auth.verify(token)) return true;

    const key = this.cfg.get<string>('APP_API_KEY');
    if (key && token) {
      const a = Buffer.from(token);
      const b = Buffer.from(key);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
    if (!this.auth.enabled && !key && this.cfg.get('NODE_ENV') !== 'production') return true;
    throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Not signed in.' });
  }
}
