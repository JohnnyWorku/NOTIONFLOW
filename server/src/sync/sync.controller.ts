import { Controller, Get, HttpCode, Logger, Post, Query, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../common/public.decorator';
import { SyncService } from './sync.service';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  private readonly log = new Logger(SyncController.name);
  constructor(private sync: SyncService, private cfg: ConfigService) {}

  @ApiBearerAuth() @Get('status')
  status() { return this.sync.status(); }

  @ApiBearerAuth() @Get('changes')
  changes(@Query('since') since = '0') { return this.sync.since(Number(since) || 0); }

  /**
   * Notion webhook receiver. Requires a public HTTPS URL (use a tunnel in dev; see docs).
   * 1) Verification handshake: Notion POSTs { verification_token }. We log it ONCE so you can paste it into
   *    the Notion UI and into NOTION_WEBHOOK_SECRET.  2) Events: verified via X-Notion-Signature (HMAC-SHA256).
   */
  @Public() @Post('webhook') @HttpCode(200)
  webhook(@Req() req: any) {
    const body = req.body ?? {};
    const secret = this.cfg.get<string>('NOTION_WEBHOOK_SECRET');
    if (body.verification_token && !secret) {
      this.log.warn(`Webhook verification token received (one-time setup; copy into Notion UI and NOTION_WEBHOOK_SECRET): ${body.verification_token}`);
      return { ok: true };
    }
    if (!secret) throw new UnauthorizedException();
    const raw: Buffer | undefined = req.rawBody;
    if (!raw) throw new BadRequestException();
    const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
    const given = String(req.headers['x-notion-signature'] ?? '');
    const a = Buffer.from(given), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
    this.sync.lastWebhookAt = new Date().toISOString();
    this.sync.bump(body.entity?.id ?? 'unknown', body.type ?? 'webhook');
    return { ok: true };
  }
}
