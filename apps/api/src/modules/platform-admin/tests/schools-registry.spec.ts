import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { SchoolsService } from '../schools/schools.service';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { AuditLogRepository } from '../../platform-foundation/repositories/audit-log.repository';
import { SchoolFileRepository } from '../../platform-foundation/repositories/school-file.repository';
import { MOD_001_ERRORS } from '@custom-school/contracts';

describe('US-001-002 School Tenant Registry', () => {
  let schoolsService: SchoolsService;
  let schoolsRepository: SchoolsRepository;

  beforeEach(() => {
    schoolsRepository = new SchoolsRepository();
    const auditRepo = new AuditLogRepository();
    const auditService = new AuditService(auditRepo);
    const fileRepo = new SchoolFileRepository();
    schoolsService = new SchoolsService(schoolsRepository, auditService, fileRepo);
  });

  it('[VT-001-006] Create a draft school with immutable UUID', async () => {
    const school = await schoolsService.createSchool({
      name: 'Oakridge International Academy',
      address: '45 Lake View Road',
      contactEmail: 'info@oakridge.edu',
    });

    expect(school).toBeDefined();
    expect(school.id).toBeDefined();
    expect(school.schoolUuid).toBeDefined();
    expect(school.status).toBe('DRAFT');
    expect(school.name).toBe('Oakridge International Academy');

    // Verify UUID cannot be mutated
    const updated = await schoolsRepository.update(school.id, {
      name: 'Oakridge Renamed',
    });
    expect(updated?.schoolUuid).toBe(school.schoolUuid);
    expect(updated?.name).toBe('Oakridge Renamed');
  });

  it('[VT-001-007] Missing or blank school name is rejected with 422', async () => {
    await expect(schoolsService.createSchool({ name: '' })).rejects.toThrow(
      UnprocessableEntityException,
    );

    try {
      await schoolsService.createSchool({ name: ' ' });
    } catch (err: any) {
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_SCHOOL_NAME_REQUIRED);
    }
  });

  it('[VT-001-008] Duplicate school name requires explicit confirmation', async () => {
    await schoolsService.createSchool({ name: 'Greenwood High' });

    // Attempting to create duplicate without confirmDuplicateName -> 409
    try {
      await schoolsService.createSchool({ name: 'Greenwood High' });
      fail('Expected 409 conflict on duplicate');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.getResponse().code).toBe(
        MOD_001_ERRORS.ERR_DUPLICATE_SCHOOL_CONFIRMATION_REQUIRED,
      );
      expect(err.getResponse().matchedSchool).toBeDefined();
    }

    // Attempting with confirmDuplicateName: true -> Succeeds
    const confirmed = await schoolsService.createSchool({
      name: 'Greenwood High',
      confirmDuplicateName: true,
    });
    expect(confirmed).toBeDefined();
    expect(confirmed.name).toBe('Greenwood High');
    expect(confirmed.status).toBe('DRAFT');
  });

  it('[VT-001-009] Search by name returns matching schools with pagination', async () => {
    await schoolsService.createSchool({ name: 'Cambridge Valley Academy' });
    await schoolsService.createSchool({ name: 'Oxford International' });

    const searchResult = await schoolsService.listSchools({
      search: 'Cambridge',
      page: 1,
      limit: 10,
    });

    expect(searchResult.items.length).toBe(1);
    expect(searchResult.items[0].name).toBe('Cambridge Valley Academy');
    expect(searchResult.items[0].schoolUuid).toBeDefined();
  });

  it('[VT-001-010] Search with no matches returns clean empty state', async () => {
    const emptyResult = await schoolsService.listSchools({
      search: 'NonExistentSchoolQueryXYZ',
    });

    expect(emptyResult.items).toEqual([]);
    expect(emptyResult.total).toBe(0);
  });
});
