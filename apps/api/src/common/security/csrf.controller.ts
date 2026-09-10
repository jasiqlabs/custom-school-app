import { Controller, Get, Req, Res } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { AppConfig } from '../../config/app-config';
import { CSRF_COOKIE, setCsrfCookie } from './cookie.util';

@Controller('security')
export class CsrfController {
  constructor(private readonly config: AppConfig) {}

  @Get('csrf')
  issue(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Keep one browser-session token stable so multiple tabs cannot invalidate one another.
    const existing = String(req.cookies?.[CSRF_COOKIE] || '');
    const token = /^[A-Za-z0-9_-]{40,128}$/.test(existing)
      ? existing
      : randomBytes(32).toString('base64url');
    if (token !== existing) setCsrfCookie(res, token, this.config);
    return { csrfToken: token };
  }
}
