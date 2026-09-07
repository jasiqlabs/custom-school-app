import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SessionService } from '../../platform-foundation/services/session.service';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { LoginAttemptRepository } from '../../platform-foundation/repositories/login-attempt.repository';
import { UsersRepository } from '../users.repository';
import { MOD_001_ERRORS } from '@custom-school/contracts';

@Injectable()
export class PlatformAuthService {
  private readonly LOCKOUT_WINDOW_MINUTES = 15;
  private readonly MAX_FAILED_ATTEMPTS = 5;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly loginAttemptRepository: LoginAttemptRepository,
  ) {}

  private hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').substring(0, 16);
  }

  async login(
    email: string,
    password: string,
    ipAddress: string = '127.0.0.1',
    userAgent?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<{
    user: { id: string; fullName: string; email: string; role: string };
    token: string;
    expiresAt: string;
  }> {
    const normalizedEmail = (email || '').trim().toLowerCase();

    // 1. Rate-limit check: 5 failed attempts in 15 minutes -> 423 ERR_ACCOUNT_TEMP_LOCKED
    const failedCount = await this.loginAttemptRepository.countRecentFailed(
      normalizedEmail,
      this.LOCKOUT_WINDOW_MINUTES * 60,
    );

    if (failedCount >= this.MAX_FAILED_ATTEMPTS) {
      throw new HttpException(
        {
          code: MOD_001_ERRORS.ERR_ACCOUNT_TEMP_LOCKED,
          message: 'Account temporarily locked due to repeated failed attempts. Try again in 15 minutes.',
        },
        423,
      );
    }

    const user = await this.usersRepository.findByEmail(normalizedEmail);

    // 2. Validate user existence & password
    if (!user || !this.usersRepository.verifyPassword(password, user.passwordHash)) {
      await this.loginAttemptRepository.record({
        id: crypto.randomUUID(),
        identifier: normalizedEmail,
        ipAddress,
        attemptedAt: new Date(),
        success: false,
        failureReason: 'INVALID_CREDENTIALS',
      });

      await this.auditService.appendAuditEvent({
        requestId,
        actorId: undefined,
        actorRole: undefined,
        schoolId: undefined,
        action: 'AUTH_LOGIN_FAILURE',
        resourceType: 'PLATFORM_USER',
        resourceId: normalizedEmail,
        ipHash: this.hashIp(ipAddress),
        metadata: { failureReason: 'INVALID_CREDENTIALS' },
      });

      throw new UnauthorizedException({
        code: MOD_001_ERRORS.ERR_AUTH_INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
      });
    }

    // 3. Status check: Deactivated admin check (BR-AUTH-003)
    if (user.status !== 'ACTIVE') {
      await this.auditService.appendAuditEvent({
        requestId,
        actorId: user.id,
        actorRole: user.role,
        schoolId: undefined,
        action: 'AUTH_LOGIN_DEACTIVATED',
        resourceType: 'PLATFORM_USER',
        resourceId: user.id,
        ipHash: this.hashIp(ipAddress),
      });

      throw new ForbiddenException({
        code: MOD_001_ERRORS.ERR_ACCOUNT_DEACTIVATED,
        message: 'This account has been deactivated. Please contact support.',
      });
    }

    // 4. Role plane check: Only PLATFORM_ADMIN can use platform login
    if (user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException({
        code: MOD_001_ERRORS.ERR_FORBIDDEN_ROLE,
        message: 'Access denied. Platform Admin role required.',
      });
    }

    // 5. Establish session (4 hours sliding TTL)
    const sessionResult = await this.sessionService.createSession({
      userId: user.id,
      role: 'PLATFORM_ADMIN',
      schoolId: undefined,
      userAgent,
      ipHash: this.hashIp(ipAddress),
    });

    await this.loginAttemptRepository.record({
      id: crypto.randomUUID(),
      identifier: normalizedEmail,
      ipAddress,
      attemptedAt: new Date(),
      success: true,
    });

    await this.auditService.appendAuditEvent({
      requestId,
      actorId: user.id,
      actorRole: 'PLATFORM_ADMIN',
      schoolId: undefined,
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'PLATFORM_USER',
      resourceId: user.id,
      ipHash: this.hashIp(ipAddress),
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      token: sessionResult.token,
      expiresAt: sessionResult.session.expiresAt.toISOString(),
    };
  }

  async logout(
    rawToken: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<void> {
    if (!rawToken) return;

    const validation = await this.sessionService.validateSession(rawToken);
    if (validation.status === 'VALID' && validation.session) {
      await this.sessionService.revokeSession(validation.session.id);
      await this.auditService.appendAuditEvent({
        requestId,
        actorId: validation.session.userId,
        actorRole: validation.session.role,
        schoolId: undefined,
        action: 'AUTH_LOGOUT',
        resourceType: 'USER_SESSION',
        resourceId: validation.session.id,
      });
    }
  }
}
