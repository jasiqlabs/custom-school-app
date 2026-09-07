import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PlatformAuthService } from './platform-auth.service';
import { SessionGuard } from '../../platform-foundation/guards/session.guard';
import { PlatformAdminGuard } from '../../platform-foundation/guards/platform-admin.guard';
import { loginPlatformAdminSchema } from '@custom-school/validation';

@Controller('api/v1/platform/auth')
export class PlatformAuthController {
  private readonly COOKIE_NAME = 'cs_sess';

  constructor(private readonly platformAuthService: PlatformAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = loginPlatformAdminSchema.parse(body);
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'];

    const result = await this.platformAuthService.login(
      validated.email,
      validated.password,
      ip,
      userAgent,
      requestId,
    );

    // Set secure HttpOnly session cookie
    res.cookie(this.COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 4 * 3600 * 1000, // 4 hours sliding inactivity TTL
    });

    return {
      user: result.user,
      token: result.token,
      expiresAt: result.expiresAt,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('x-request-id') requestId?: string,
  ) {
    let rawToken = req.cookies?.[this.COOKIE_NAME];
    if (!rawToken && req.headers['authorization']?.startsWith('Bearer ')) {
      rawToken = req.headers['authorization'].substring(7);
    }
    if (rawToken) {
      await this.platformAuthService.logout(rawToken, requestId);
    }
    res.clearCookie(this.COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  @Get('me')
  @UseGuards(SessionGuard, PlatformAdminGuard)
  async me(@Req() req: Request) {
    const session = (req as any).session;
    return {
      session: {
        id: session?.id,
        userId: session?.userId,
        role: session?.role,
        expiresAt: session?.expiresAt,
      },
    };
  }
}
