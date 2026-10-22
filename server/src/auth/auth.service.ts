import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passwordMatches, signToken, verifyToken } from './token';

@Injectable()
export class AuthService {
  static readonly TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly secret?: string;
  private readonly password?: string;

  constructor(cfg: ConfigService) {
    this.secret = cfg.get<string>('AUTH_SECRET') || undefined;
    this.password = cfg.get<string>('APP_PASSWORD') || undefined;
    if (this.secret && this.secret.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters (generate: openssl rand -hex 32).');
    if (this.password && this.password.length < 8) throw new Error('APP_PASSWORD must be at least 8 characters.');
    if (!this.enabled && cfg.get('NODE_ENV') === 'production') {
      new Logger(AuthService.name).error('APP_PASSWORD / AUTH_SECRET not set: all protected routes will be denied.');
    }
  }

  get enabled(): boolean {
    return !!this.secret && !!this.password;
  }
  checkPassword(given: string): boolean {
    return !!this.password && passwordMatches(this.password, given);
  }
  issue() {
    return signToken(this.secret!, AuthService.TTL_MS);
  }
  verify(token: string): boolean {
    return !!this.secret && verifyToken(this.secret, token);
  }
}
