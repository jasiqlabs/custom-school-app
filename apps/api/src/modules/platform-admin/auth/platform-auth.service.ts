import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../database/prisma.service';
import { AppConfig } from '../../../config/app-config';
import { SessionService } from '../../../platform/auth/session.service';
import { AuthRateService } from '../../../platform/auth/auth-rate.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { ApiError } from '../../../common/http/api-error';
import type { SessionActor } from '@custom-school/contracts';

@Injectable()
export class PlatformAuthService {
  private readonly dummyHash: Promise<string>;
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly sessions: SessionService,
    private readonly rate: AuthRateService,
    private readonly audit: AuditService,
  ) {
    this.dummyHash = argon2.hash('GDYS-DUMMY-DO-NOT-USE-A1a', { type: argon2.argon2id });
  }

  async login(email: string, password: string, ip: string, requestId: string) {
    const normalized = email.trim().toLowerCase();
    await this.rate.assertLoginAllowed('PLATFORM_ADMIN', normalized, ip);
    const user = await this.prisma.platformUser.findUnique({ where: { email: normalized } });
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.rate.record('PLATFORM_ADMIN', normalized, ip, false, 'LOCKED');
      throw new ApiError(423, 'ERR_ACCOUNT_LOCKED', 'Account is temporarily locked');
    }

    const hash = user?.passwordHash || await this.dummyHash;
    let ok = false;
    try { ok = await argon2.verify(hash, password); } catch { ok = false; }
    if (!user || !ok || user.status !== 'ACTIVE') {
      if (user && user.status === 'ACTIVE') {
        const next = user.failedCount + 1;
        await this.prisma.platformUser.update({
          where: { id: user.id },
          data: {
            failedCount: next,
            lockedUntil: next >= this.config.loginMaxFailures ? new Date(Date.now() + this.config.loginLockMinutes * 60_000) : null,
          },
        });
      }
      await this.rate.record('PLATFORM_ADMIN', normalized, ip, false, 'INVALID_CREDENTIAL');
      await this.audit.append({
        requestId,
        actorType: 'ANONYMOUS',
        eventType: 'PLATFORM_LOGIN_FAILED',
        targetType: 'PLATFORM_USER',
        targetId: user?.id,
        ipHash: this.rate.ipHash(ip),
        metadata: { knownAccount: Boolean(user) },
      });
      throw new ApiError(401, 'ERR_INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.platformUser.update({ where: { id: user.id }, data: { failedCount: 0, lockedUntil: null } });
      const session = await this.sessions.create({ userType: 'PLATFORM_ADMIN', userId: fresh.id, schoolId: null, accountVersion: fresh.accountVersion }, tx);
      await this.audit.append({ requestId, actorType: 'PLATFORM_ADMIN', actorId: fresh.id, eventType: 'PLATFORM_LOGIN_SUCCEEDED', targetType: 'PLATFORM_USER', targetId: fresh.id, ipHash: this.rate.ipHash(ip) }, tx as any);
      return { session, user: fresh };
    });
    await this.rate.record('PLATFORM_ADMIN', normalized, ip, true);
    return { token: result.session.token, expiresAt: result.session.expiresAt, user: { id: result.user.id, fullName: result.user.fullName, email: result.user.email } };
  }

  async logout(actor: SessionActor) {
    await this.prisma.$transaction(async (tx) => {
      await this.sessions.revokeCurrent(actor.sessionId, 'LOGOUT', tx);
      await this.audit.append({ requestId: actor.requestId, actorType: 'PLATFORM_ADMIN', actorId: actor.userId, eventType: 'PLATFORM_LOGOUT', targetType: 'SESSION', targetId: actor.sessionId }, tx as any);
    });
  }

  async session(actor: SessionActor) {
    const user = await this.prisma.platformUser.findUnique({ where: { id: actor.userId }, select: { id: true, email: true, fullName: true, status: true } });
    if (!user) throw new ApiError(401, 'ERR_SESSION_INVALID', 'Session invalid');
    return { user, expiresInHours: 4 };
  }
}
