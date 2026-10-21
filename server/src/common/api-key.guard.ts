import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { IS_PUBLIC } from './public.decorator';

/**
 * Single-user auth: shared secret in the Authorization header.
 * In production an unset APP_API_KEY denies everything (fail closed).
 * CORS is NOT access control; this guard is.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly log = new Logger(ApiKeyGuard.name);
  constructor(private reflector: Reflector, private cfg: ConfigService) {
    if (!cfg.get('APP_API_KEY') && cfg.get('NODE_ENV') !== 'production') {
      this.log.warn('APP_API_KEY not set: API is OPEN (development only).');
    }
  }
  canActivate(ctx: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const key = this.cfg.get<string>('APP_API_KEY');
    if (!key) {
      if (this.cfg.get('NODE_ENV') === 'production') throw new UnauthorizedException();
      return true;
    }
    const header: string = ctx.switchToHttp().getRequest().headers['authorization'] ?? '';
    const given = header.startsWith('Bearer ') ? header.slice(7) : '';
    const a = Buffer.from(given);
    const b = Buffer.from(key);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
    return true;
  }
}
