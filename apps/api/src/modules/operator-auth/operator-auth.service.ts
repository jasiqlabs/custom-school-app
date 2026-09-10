import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { AppConfig } from '../../config/app-config';
import { SessionService } from '../../platform/auth/session.service';
import { AuthRateService } from '../../platform/auth/auth-rate.service';
import { AuditService } from '../../platform/audit/audit.service';
import { ApiError } from '../../common/http/api-error';
import { PlatformAdminPublicFacade } from '../platform-admin/public-facade/platform-admin.facade';
import type { SessionActor } from '@custom-school/contracts';

@Injectable()
export class OperatorAuthService {
  private readonly dummyHash: Promise<string>;
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly sessions: SessionService,
    private readonly rate: AuthRateService,
    private readonly audit: AuditService,
    private readonly admin: PlatformAdminPublicFacade,
  ) { this.dummyHash = argon2.hash('GDYS-DUMMY-DO-NOT-USE-A1a', { type: argon2.argon2id }); }

  async login(email: string, password: string, ip: string, requestId: string) {
    const normalized = email.trim().toLowerCase();
    await this.rate.assertLoginAllowed('OPERATOR', normalized, ip);
    const operator = await this.admin.getOperatorForAuth(normalized);
    if (operator?.lockedUntil && operator.lockedUntil.getTime() > Date.now()) {
      await this.rate.record('OPERATOR', normalized, ip, false, 'LOCKED');
      throw new ApiError(423, 'ERR_ACCOUNT_LOCKED', 'Account is temporarily locked');
    }
    const hash = operator?.passwordHash || await this.dummyHash;
    let ok = false;
    try { ok = await argon2.verify(hash, password); } catch { ok = false; }
    if (!operator || !ok) {
      if (operator) await this.admin.recordOperatorLoginFailure(operator.id, this.config.loginMaxFailures, this.config.loginLockMinutes);
      await this.rate.record('OPERATOR', normalized, ip, false, 'INVALID_CREDENTIAL');
      throw new ApiError(401, 'ERR_INVALID_CREDENTIALS', 'Invalid email or password');
    }
    if (operator.status !== 'ACTIVE' || operator.school.status !== 'ACTIVE') {
      await this.rate.record('OPERATOR', normalized, ip, false, 'INACTIVE');
      throw new ApiError(403, 'ERR_ACCOUNT_INACTIVE', 'Account is not available');
    }

    const result = await this.admin.withOperatorLoginGuard(operator.id, async fresh => {
      const session = await this.sessions.create({ userType: 'OPERATOR', userId: fresh.id, schoolId: fresh.schoolId, accountVersion: fresh.accountVersion, schoolAccessVersion: fresh.school.accessVersion });
      try {
        await this.audit.append({ requestId, schoolId: fresh.schoolId, actorType: 'OPERATOR', actorId: fresh.id, eventType: 'OPERATOR_LOGIN_SUCCEEDED', targetType: 'SCHOOL_OPERATOR', targetId: fresh.id, ipHash: this.rate.ipHash(ip) });
      } catch (error) {
        await this.sessions.revokeCurrent(session.sessionId, 'AUDIT_FAILURE').catch(() => undefined);
        throw error;
      }
      return { fresh, session };
    });
    await this.rate.record('OPERATOR', normalized, ip, true);
    return { token: result.session.token, expiresAt: result.session.expiresAt, operator: { id: result.fresh.id, fullName: result.fresh.fullName }, school: { id: result.fresh.school.id, name: result.fresh.school.name } };
  }

  async logout(actor: SessionActor) {
    await this.prisma.$transaction(async tx => {
      await this.sessions.revokeCurrent(actor.sessionId, 'LOGOUT', tx);
      await this.audit.append({ requestId: actor.requestId, schoolId: actor.schoolId, actorType: 'OPERATOR', actorId: actor.userId, eventType: 'OPERATOR_LOGOUT', targetType: 'SESSION', targetId: actor.sessionId }, tx as any);
    });
  }

  async resetRequest(email: string, ip: string) {
    const normalized = email.trim().toLowerCase();
    await this.rate.assertResetAllowed(normalized, ip);
    const operator = await this.admin.getOperatorForAuth(normalized);
    if (operator) await this.prisma.passwordResetRequest.create({ data: { operatorId: operator.id, requestIpHash: this.rate.ipHash(ip) } });
    await this.rate.recordReset(normalized, ip);
    return { accepted: true, message: 'If this account can be assisted, contact or wait for your administrator.' };
  }

  async session(actor: SessionActor) {
    const operator = await this.admin.getOperatorSessionIdentity(actor.userId, actor.schoolId!);
    if (!operator) throw new ApiError(401, 'ERR_SESSION_INVALID', 'Session invalid');
    return { operator: { id: operator.id, fullName: operator.fullName, email: operator.email }, school: operator.school, expiresInHours: 8 };
  }
}
