import { UnauthorizedException, ForbiddenException, HttpException } from '@nestjs/common';
import { PlatformAuthService } from '../auth/platform-auth.service';
import { UsersRepository } from '../users.repository';
import { SessionService } from '../../platform-foundation/services/session.service';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { LoginAttemptRepository } from '../../platform-foundation/repositories/login-attempt.repository';
import { UserSessionRepository } from '../../platform-foundation/repositories/user-session.repository';
import { AuditLogRepository } from '../../platform-foundation/repositories/audit-log.repository';
import { OperatorGuard } from '../../platform-foundation/guards/operator.guard';
import { MOD_001_ERRORS } from '@custom-school/contracts';

describe('US-001-001 Platform Admin Authentication & Role-Plane Separation', () => {
  let authService: PlatformAuthService;
  let usersRepository: UsersRepository;
  let sessionService: SessionService;
  let operatorGuard: OperatorGuard;

  beforeEach(() => {
    usersRepository = new UsersRepository();
    const sessionRepo = new UserSessionRepository();
    sessionService = new SessionService(sessionRepo);
    const auditRepo = new AuditLogRepository();
    const auditService = new AuditService(auditRepo);
    const loginAttemptRepo = new LoginAttemptRepository();

    authService = new PlatformAuthService(
      usersRepository,
      sessionService,
      auditService,
      loginAttemptRepo,
    );

    operatorGuard = new OperatorGuard();
  });

  it('[VT-001-001] Active Platform Admin signs in successfully', async () => {
    const result = await authService.login('admin@customschool.com', 'Admin@12345');
    expect(result).toBeDefined();
    expect(result.user.email).toBe('admin@customschool.com');
    expect(result.user.role).toBe('PLATFORM_ADMIN');
    expect(result.token).toBeDefined();

    // Verify session validation
    const validation = await sessionService.validateSession(result.token);
    expect(validation.status).toBe('VALID');
    expect(validation.session?.role).toBe('PLATFORM_ADMIN');
  });

  it('[VT-001-002] Incorrect password is rejected with generic error', async () => {
    await expect(
      authService.login('admin@customschool.com', 'WrongPassword!'),
    ).rejects.toThrow(UnauthorizedException);

    try {
      await authService.login('admin@customschool.com', 'WrongPassword!');
    } catch (err: any) {
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_AUTH_INVALID_CREDENTIALS);
      expect(err.getResponse().message).toBe('Invalid email or password.');
    }
  });

  it('[VT-001-003] Deactivated admin cannot authenticate', async () => {
    // Create deactivated admin
    await usersRepository.create({
      fullName: 'Deactivated Admin',
      email: 'deactivated@customschool.com',
      passwordHash: usersRepository.hashPassword('Admin@12345'),
      role: 'PLATFORM_ADMIN',
      schoolId: null,
      status: 'INACTIVE',
    });

    await expect(
      authService.login('deactivated@customschool.com', 'Admin@12345'),
    ).rejects.toThrow(ForbiddenException);

    try {
      await authService.login('deactivated@customschool.com', 'Admin@12345');
    } catch (err: any) {
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_ACCOUNT_DEACTIVATED);
    }
  });

  it('[VT-001-004] Repeated failures temporarily lock authentication after 5 attempts', async () => {
    const testEmail = 'lockout@customschool.com';
    await usersRepository.create({
      fullName: 'Lockout Test',
      email: testEmail,
      passwordHash: usersRepository.hashPassword('Admin@12345'),
      role: 'PLATFORM_ADMIN',
      schoolId: null,
      status: 'ACTIVE',
    });

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      await expect(authService.login(testEmail, 'BadPass' + i)).rejects.toThrow(
        UnauthorizedException,
      );
    }

    // 5th failed attempt
    await expect(authService.login(testEmail, 'BadPass5')).rejects.toThrow(
      UnauthorizedException,
    );

    // 6th attempt should trigger temporary lock (423) even if correct password is provided
    try {
      await authService.login(testEmail, 'Admin@12345');
      throw new Error('Expected locked exception');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(423);
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_ACCOUNT_TEMP_LOCKED);
    }
  });

  it('[VT-001-005] OperatorGuard rejects Platform Admin session on operator routes', () => {
    const mockExecutionContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'PLATFORM_ADMIN' },
        }),
      }),
    };

    try {
      operatorGuard.canActivate(mockExecutionContext);
      throw new Error('Expected plane exception');
    } catch (err: any) {
      expect(err.getStatus()).toBe(403);
    }
  });
});
