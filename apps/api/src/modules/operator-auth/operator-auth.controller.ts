import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { loginSchema, passwordResetRequestSchema } from '@custom-school/validation';
import { OperatorAuthService } from './operator-auth.service';
import { AppConfig } from '../../config/app-config';
import { setSessionCookie, clearSessionCookie } from '../../common/security/cookie.util';
import { OperatorGuard } from '../../common/security/session.guard';
import { CsrfGuard } from '../../common/security/csrf.guard';
import { CurrentSession } from '../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';

@Controller('operator/auth')
export class OperatorAuthController {
  constructor(private readonly service: OperatorAuthService, private readonly config: AppConfig) {}

  @Post('login')
  @UseGuards(CsrfGuard)
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const value = loginSchema.parse(body);
    const result = await this.service.login(value.email, value.password, req.ip || '', (req as any).requestId);
    setSessionCookie(res, result.token, this.config);
    return { operator: result.operator, school: result.school, expiresAt: result.expiresAt };
  }

  @Post('logout')
  @UseGuards(OperatorGuard, CsrfGuard)
  async logout(@CurrentSession() actor: SessionActor, @Res() res: Response) {
    await this.service.logout(actor);
    clearSessionCookie(res, this.config);
    res.status(204).send();
  }

  @Post('password-reset-request')
  @UseGuards(CsrfGuard)
  reset(@Body() body: unknown, @Req() req: Request) {
    const value = passwordResetRequestSchema.parse(body);
    return this.service.resetRequest(value.email, req.ip || '');
  }

  @Get('session')
  @UseGuards(OperatorGuard)
  session(@CurrentSession() actor: SessionActor) { return this.service.session(actor); }
}
