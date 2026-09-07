import { ConflictException } from '@nestjs/common';
import { AcademicMasterService } from '../academics/academic-master.service';
import { AcademicsRepository } from '../academics/academics.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { AuditLogRepository } from '../../platform-foundation/repositories/audit-log.repository';
import { MOD_001_ERRORS } from '@custom-school/contracts';

describe('US-001-004 Manage School Classes and Sections', () => {
  let academicService: AcademicMasterService;
  let academicsRepository: AcademicsRepository;
  let schoolsRepository: SchoolsRepository;
  let schoolId: string;

  beforeEach(async () => {
    academicsRepository = new AcademicsRepository();
    schoolsRepository = new SchoolsRepository();
    const auditRepo = new AuditLogRepository();
    const auditService = new AuditService(auditRepo);

    academicService = new AcademicMasterService(
      academicsRepository,
      schoolsRepository,
      auditService,
    );

    const school = await schoolsRepository.create({ name: 'St. Jude International' });
    schoolId = school.id;
  });

  it('[VT-001-016] Create unique class for a school', async () => {
    const cls = await academicService.createClass(schoolId, {
      name: 'Grade 10',
      displayOrder: 10,
    });

    expect(cls).toBeDefined();
    expect(cls.name).toBe('Grade 10');
    expect(cls.schoolId).toBe(schoolId);
    expect(cls.status).toBe('ACTIVE');
  });

  it('[VT-001-017] Duplicate class name in the same school is blocked', async () => {
    await academicService.createClass(schoolId, { name: 'Grade 10' });

    try {
      await academicService.createClass(schoolId, { name: 'Grade 10' });
      fail('Expected duplicate class conflict');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_ACADEMIC_DUPLICATE);
    }
  });

  it('[VT-001-018] Create section under class with school-scoped foreign key', async () => {
    const cls = await academicService.createClass(schoolId, { name: 'Grade 8' });
    const sec = await academicService.createSection(schoolId, cls.id, { name: 'Section A' });

    expect(sec).toBeDefined();
    expect(sec.name).toBe('Section A');
    expect(sec.classId).toBe(cls.id);
    expect(sec.schoolId).toBe(schoolId);
    expect(sec.status).toBe('ACTIVE');
  });

  it('[VT-001-019] Duplicate section in same class is blocked', async () => {
    const cls = await academicService.createClass(schoolId, { name: 'Grade 9' });
    await academicService.createSection(schoolId, cls.id, { name: 'Section Blue' });

    try {
      await academicService.createSection(schoolId, cls.id, { name: 'Section Blue' });
      fail('Expected duplicate section conflict');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_ACADEMIC_DUPLICATE);
    }
  });

  it('[VT-001-020] Active enrollment blocks physical delete, permits deactivation (BR-CLS-002)', async () => {
    const cls = await academicService.createClass(schoolId, { name: 'Grade 11' });
    const sec = await academicService.createSection(schoolId, cls.id, { name: 'Section Science' });

    // Register active student enrollment on section and class
    academicsRepository.setActiveEnrollmentCount(sec.id, 25);
    academicsRepository.setActiveEnrollmentCount(cls.id, 25);

    // 1. Attempting physical delete on section should fail with 409 ERR_ACADEMIC_IN_USE
    try {
      await academicService.deleteSection(schoolId, cls.id, sec.id);
      fail('Expected active enrollment delete conflict');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_ACADEMIC_IN_USE);
      expect(err.getResponse().canDeactivate).toBe(true);
    }

    // 2. Logical deactivation should succeed
    const deactivatedSec = await academicService.updateSection(schoolId, cls.id, sec.id, {
      status: 'INACTIVE',
    });
    expect(deactivatedSec.status).toBe('INACTIVE');

    // 3. Attempting physical delete on class should also fail with 409 ERR_ACADEMIC_IN_USE
    try {
      await academicService.deleteClass(schoolId, cls.id);
      fail('Expected active enrollment delete conflict');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_ACADEMIC_IN_USE);
    }

    // 4. Logical deactivation of class should succeed
    const deactivatedCls = await academicService.updateClass(schoolId, cls.id, {
      status: 'INACTIVE',
    });
    expect(deactivatedCls.status).toBe('INACTIVE');
  });

  it('[VT-001-021] Inactive academic structure is excluded from facade pickers', async () => {
    const activeClass = await academicService.createClass(schoolId, { name: 'Active Class 1' });
    await academicService.createSection(schoolId, activeClass.id, { name: 'Section Active A' });
    const inactiveSec = await academicService.createSection(schoolId, activeClass.id, {
      name: 'Section Retired B',
    });
    await academicService.updateSection(schoolId, activeClass.id, inactiveSec.id, {
      status: 'INACTIVE',
    });

    const inactiveClass = await academicService.createClass(schoolId, { name: 'Retired Class 2' });
    await academicService.updateClass(schoolId, inactiveClass.id, { status: 'INACTIVE' });

    // Query through facade method
    const structure = await academicService.getActiveAcademicStructure(schoolId);

    // Only active class should be returned
    expect(structure.length).toBe(1);
    expect(structure[0].className).toBe('Active Class 1');

    // Only active section should be returned
    expect(structure[0].sections.length).toBe(1);
    expect(structure[0].sections[0].name).toBe('Section Active A');
  });
});
