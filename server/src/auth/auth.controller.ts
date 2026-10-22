import { Body, Controller, Get, HttpCode, ServiceUnavailableException, UnauthorizedException, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString() @MinLength(1) @MaxLength(200) password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Strict rate limit to slow password guessing. Returns a 30-day signed token. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    if (!this.auth.enabled) throw new ServiceUnavailableException({ code: 'AUTH_NOT_CONFIGURED', message: 'Login is not configured on the server (APP_PASSWORD / AUTH_SECRET).' });
    if (!this.auth.checkPassword(dto.password)) throw new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'Incorrect password.' });
    return this.auth.issue();
  }

  @ApiBearerAuth()
  @Get('me')
  me() {
    return { ok: true };
  }
}
