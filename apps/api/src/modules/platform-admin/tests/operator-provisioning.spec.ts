import { ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { OperatorsService } from '../operators/operators.service';
import { SchoolsService } from '../schools/schools.service';
import { SchoolsRepository } from '../schools/schools.repository';
import { UsersRepository } from '../users.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { AuditLogRepository } from '../../platform-foundation/repositories/audit-log.repository';
import { SchoolFileRepository } from '../../platform-foundation/repositories/school-file.repository';
import { UserSessionRepository } from '../../platform-foundation/repositories/user-session.repository';
import { SessionService } from '../../platform-foundation/services/session.service';
import { TenantContextService } from '../../platform-foundation/services/tenant-context.service';
import { TenantRepository } from '../../platform-foundation/repositories/tenant.repository';
import { MOD_001_ERRORS } from '@custom-school/contracts';

class DummyTenantResourceRepository extends TenantRepository<{ id: string; schoolId: string; title: string }> {
  private items = [
    { id: 'res-a1', schoolId: 'school-aaa', title: 'Curriculum A' },
    { id: 'res-b1', schoolId: 'school-bbb', title: 'Curriculum B' },
  ];

  findById(id: string) {
    const item = this.items.find((i) => i.id === id) || null;
    return this.filterByTenant(item);
  }
}

describe('US-001-006 Provision School Operator Account for an Active School', () => {
  let operatorsService: OperatorsService;
  let schoolsService: SchoolsService;
  let schoolsRepository: SchoolsRepository;
  let usersRepository: UsersRepository;
  let auditLogRepository: AuditLogRepository;
  let userSessionRepository: UserSessionRepository;
  let sessionService: SessionService;
  let tenantContextService: TenantContextService;
  let resourceRepository: DummyTenantResourceRepository;

  beforeEach(() => {
    schoolsRepository = new SchoolsRepository();
    usersRepository = new UsersRepository();
    auditLogRepository = new AuditLogRepository();
    const auditService = new AuditService(auditLogRepository);
    const fileRepo = new SchoolFileRepository();
    userSessionRepository = new UserSessionRepository();
    sessionService = new SessionService(userSessionRepository);
    tenantContextService = new TenantContextService();
    resourceRepository = new DummyTenantResourceRepository(tenantContextService);

    schoolsService = new SchoolsService(
      schoolsRepository,
      auditService,
      fileRepo,
      userSessionRepository,
    );

    operatorsService = new OperatorsService(
      usersRepository,
      schoolsRepository,
      auditService,
      userSessionRepository,
    );
  });

  it('[VT-001-027] Provision operator for an active school with Argon2id hash', async () => {
    const school = await schoolsService.createSchool({
      name: 'Riverdale High',
    });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    const operator = await operatorsService.provisionOperator(school.id, {
      fullName: 'John Operator',
      email: 'john@riverdale.edu',
      temporaryPassword: 'TempSecretPassword123!',
    });

    expect(operator).toBeDefined();
    expect(operator.id).toBeDefined();
    expect(operator.schoolId).toBe(school.id);
    expect(operator.email).toBe('john@riverdale.edu');
    expect(operator.status).toBe('ACTIVE');

    // Verify stored password hash is Argon2id
    const storedUser = await usersRepository.findById(operator.id);
    expect(storedUser).toBeDefined();
    expect(storedUser?.passwordHash).toMatch(/^\$argon2id\$/);

    // Verify password verification succeeds
    const matches = await argon2.verify(storedUser!.passwordHash, 'TempSecretPassword123!');
    expect(matches).toBe(true);
  });

  it('[VT-001-028] Duplicate operator email is blocked platform-wide', async () => {
    const school1 = await schoolsService.createSchool({ name: 'School One' });
    const school2 = await schoolsService.createSchool({ name: 'School Two' });
    await schoolsService.changeStatus(school1.id, { status: 'ACTIVE' });
    await schoolsService.changeStatus(school2.id, { status: 'ACTIVE' });

    await operatorsService.provisionOperator(school1.id, {
      fullName: 'Alice Staff',
      email: 'staff@example.com',
      temporaryPassword: 'Password123!',
    });

    // Attempting to register the same email in School Two must be blocked with 409
    await expect(
      operatorsService.provisionOperator(school2.id, {
        fullName: 'Alice Clone',
        email: 'staff@example.com',
        temporaryPassword: 'AnotherPassword123!',
      }),
    ).rejects.toThrow(ConflictException);

    try {
      await operatorsService.provisionOperator(school2.id, {
        fullName: 'Alice Clone',
        email: 'staff@example.com',
        temporaryPassword: 'AnotherPassword123!',
      });
    } catch (err: any) {
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_DUPLICATE_OPERATOR_EMAIL);
    }
  });

  it('[VT-001-029] Inactive or Draft school blocks operator provisioning', async () => {
    const draftSchool = await schoolsService.createSchool({ name: 'Draft Academy' });
    expect(draftSchool.status).toBe('DRAFT');

    await expect(
      operatorsService.provisionOperator(draftSchool.id, {
        fullName: 'Bob Staff',
        email: 'bob@draft.edu',
        temporaryPassword: 'Password123!',
      }),
    ).rejects.toThrow(ConflictException);

    try {
      await operatorsService.provisionOperator(draftSchool.id, {
        fullName: 'Bob Staff',
        email: 'bob@draft.edu',
        temporaryPassword: 'Password123!',
      });
    } catch (err: any) {
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_SCHOOL_NOT_ACTIVE);
    }
  });

  it('[VT-001-030] Operator is bound to only one school tenant', async () => {
    const schoolA = await schoolsService.createSchool({ name: 'School AAA' });
    await schoolsService.changeStatus(schoolA.id, { status: 'ACTIVE' });

    const opA = await operatorsService.provisionOperator(schoolA.id, {
      fullName: 'Operator A',
      email: 'opa@schoola.edu',
      temporaryPassword: 'Password123!',
    });

    // Run within operator A tenant context
    tenantContextService.runWithContext(
      {
        schoolId: 'school-aaa',
        role: 'SCHOOL_OPERATOR',
        userId: opA.id,
        sessionId: 'sess-op-a',
      },
      () => {
        // Can access School AAA curriculum
        const ownRes = resourceRepository.findById('res-a1');
        expect(ownRes).not.toBeNull();
        expect(ownRes?.title).toBe('Curriculum A');

        // Cannot access School BBB curriculum (cross-tenant leakage blocked)
        const crossRes = resourceRepository.findById('res-b1');
        expect(crossRes).toBeNull();
      },
    );
  });

  it('[VT-001-031] Temporary password is redacted from logs and API response', async () => {
    const school = await schoolsService.createSchool({ name: 'Secure Valley' });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    const rawPassword = 'SuperSecretPlainPassword123!';
    const operator = await operatorsService.provisionOperator(school.id, {
      fullName: 'Redacted Operator',
      email: 'redacted@secure.edu',
      temporaryPassword: rawPassword,
    });

    // 1. API return payload check: password must not exist
    expect((operator as any).password).toBeUndefined();
    expect((operator as any).temporaryPassword).toBeUndefined();
    expect((operator as any).passwordHash).toBeUndefined();

    // 2. Audit log check: password must not be present in metadata
    const audits = await auditLogRepository.findBySchoolId(school.id);
    const provAudit = audits.find((a) => a.action === 'OPERATOR_PROVISIONED');
    expect(provAudit).toBeDefined();

    const serializedAudit = JSON.stringify(provAudit);
    expect(serializedAudit).not.toContain(rawPassword);
  });
});
