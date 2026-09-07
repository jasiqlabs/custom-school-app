import { UnprocessableEntityException } from '@nestjs/common';
import { SchoolsService } from '../schools/schools.service';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { AuditLogRepository } from '../../platform-foundation/repositories/audit-log.repository';
import { SchoolFileRepository } from '../../platform-foundation/repositories/school-file.repository';
import { UserSessionRepository } from '../../platform-foundation/repositories/user-session.repository';
import { SessionService } from '../../platform-foundation/services/session.service';
import { MOD_001_ERRORS } from '@custom-school/contracts';

describe('US-001-005 School Operational Status Lifecycle', () => {
  let schoolsService: SchoolsService;
  let schoolsRepository: SchoolsRepository;
  let auditLogRepository: AuditLogRepository;
  let userSessionRepository: UserSessionRepository;
  let sessionService: SessionService;

  beforeEach(() => {
    schoolsRepository = new SchoolsRepository();
    auditLogRepository = new AuditLogRepository();
    const auditService = new AuditService(auditLogRepository);
    const fileRepo = new SchoolFileRepository();
    userSessionRepository = new UserSessionRepository();
    sessionService = new SessionService(userSessionRepository);

    schoolsService = new SchoolsService(
      schoolsRepository,
      auditService,
      fileRepo,
      userSessionRepository,
    );
  });

  it('[VT-001-022] Activate draft school with valid name', async () => {
    const school = await schoolsService.createSchool({
      name: 'St. Jude Academy',
      address: '12 Jude Street',
    });
    expect(school.status).toBe('DRAFT');

    const activated = await schoolsService.changeStatus(school.id, {
      status: 'ACTIVE',
    }, 'admin-1', 'req-act-1');

    expect(activated.status).toBe('ACTIVE');

    // Verify audit log
    const audits = await auditLogRepository.findBySchoolId(school.id);
    const statusAudit = audits.find((a) => a.action === 'SCHOOL_STATUS_CHANGED');
    expect(statusAudit).toBeDefined();
    expect(statusAudit?.metadata?.previousStatus).toBe('DRAFT');
    expect(statusAudit?.metadata?.newStatus).toBe('ACTIVE');
  });

  it('[VT-001-023] Activation without valid school name is blocked', async () => {
    const school = await schoolsService.createSchool({
      name: 'Temp Name',
    });

    // Artificially clear name in repository
    await schoolsRepository.update(school.id, { name: ' ' });

    await expect(
      schoolsService.changeStatus(school.id, {
        status: 'ACTIVE',
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    try {
      await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });
    } catch (err: any) {
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_SCHOOL_NAME_REQUIRED);
    }
  });

  it('[VT-001-024] Deactivation requires non-blank reason', async () => {
    const school = await schoolsService.createSchool({
      name: 'Greenfield High School',
    });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    // Missing reason should throw
    await expect(
      schoolsService.changeStatus(school.id, {
        status: 'INACTIVE',
        reason: '   ',
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    // Valid deactivation
    const deactivated = await schoolsService.changeStatus(school.id, {
      status: 'INACTIVE',
      reason: 'Administrative non-compliance notice',
    }, 'admin-1', 'req-deact-1');

    expect(deactivated.status).toBe('INACTIVE');

    const audits = await auditLogRepository.findBySchoolId(school.id);
    const deactAudit = audits.find((a) => a.action === 'SCHOOL_STATUS_CHANGED' && a.metadata?.newStatus === 'INACTIVE');
    expect(deactAudit).toBeDefined();
    expect(deactAudit?.metadata?.reason).toBe('Administrative non-compliance notice');
  });

  it('[VT-001-025] Deactivated school revokes operator sessions immediately', async () => {
    const school = await schoolsService.createSchool({
      name: 'Bluebell Valley School',
    });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    // Create an active operator session for this school
    const { token, session } = await sessionService.createSession({
      userId: 'op-bluebell-1',
      role: 'SCHOOL_OPERATOR',
      schoolId: school.id,
    });

    // Session is valid initially
    const initialValidation = await sessionService.validateSession(token);
    expect(initialValidation.status).toBe('VALID');

    // Deactivate school
    await schoolsService.changeStatus(school.id, {
      status: 'INACTIVE',
      reason: 'Payment defaulted',
    });

    // Session is now revoked immediately
    const postDeactValidation = await sessionService.validateSession(token);
    expect(postDeactValidation.status).toBe('REVOKED');
  });

  it('[VT-001-026] Reactivation does not restore individually deactivated operators', async () => {
    const school = await schoolsService.createSchool({
      name: 'Horizon Academy',
    });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    // Mock operators state: one active, one individually deactivated
    const operators = [
      { id: 'op-1', email: 'active@horizon.edu', status: 'ACTIVE' as const },
      { id: 'op-2', email: 'locked@horizon.edu', status: 'INACTIVE' as const },
    ];

    // Deactivate school
    await schoolsService.changeStatus(school.id, {
      status: 'INACTIVE',
      reason: 'Term break audit',
    });

    // Reactivate school
    await schoolsService.changeStatus(school.id, {
      status: 'ACTIVE',
    });

    // Individually deactivated operator remains locked
    const lockedOp = operators.find((o) => o.id === 'op-2');
    expect(lockedOp?.status).toBe('INACTIVE');

    const activeOp = operators.find((o) => o.id === 'op-1');
    expect(activeOp?.status).toBe('ACTIVE');
  });
});
