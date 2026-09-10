import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { loginSchema } from '@custom-school/validation';
import { PlatformAuthService } from './platform-auth.service';
import { AppConfig } from '../../../config/app-config';
import { setSessionCookie, clearSessionCookie } from '../../../common/security/cookie.util';
import { PlatformAdminGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';

@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly service: PlatformAuthService, private readonly config: AppConfig) {}

  @Post('login')
  @UseGuards(CsrfGuard)
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const value = loginSchema.parse(body);
    const result = await this.service.login(value.email, value.password, req.ip || '', (req as any).requestId);
    setSessionCookie(res, result.token, this.config);
    return { user: result.user, expiresAt: result.expiresAt };
  }

  @Post('logout')
  @UseGuards(PlatformAdminGuard, CsrfGuard)
  async logout(@CurrentSession() actor: SessionActor, @Res() res: Response) {
    await this.service.logout(actor);
    clearSessionCookie(res, this.config);
    res.status(204).send();
  }

  @Get('session')
  @UseGuards(PlatformAdminGuard)
  session(@CurrentSession() actor: SessionActor) { return this.service.session(actor); }
}
