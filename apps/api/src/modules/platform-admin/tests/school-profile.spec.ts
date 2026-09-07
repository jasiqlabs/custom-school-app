import { UnprocessableEntityException } from '@nestjs/common';
import { SchoolsService } from '../schools/schools.service';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { AuditLogRepository } from '../../platform-foundation/repositories/audit-log.repository';
import { SchoolFileRepository } from '../../platform-foundation/repositories/school-file.repository';

describe('US-001-003 Maintain School Profile, Branding & Principal Details', () => {
  let schoolsService: SchoolsService;
  let schoolsRepository: SchoolsRepository;
  let schoolFileRepository: SchoolFileRepository;

  beforeEach(() => {
    schoolsRepository = new SchoolsRepository();
    const auditRepo = new AuditLogRepository();
    const auditService = new AuditService(auditRepo);
    schoolFileRepository = new SchoolFileRepository();

    schoolsService = new SchoolsService(
      schoolsRepository,
      auditService,
      schoolFileRepository,
    );
  });

  it('[VT-001-011] Update valid school profile information while preserving immutable UUID', async () => {
    const school = await schoolsService.createSchool({
      name: 'Beacon Hill Academy',
      address: 'Old Address 100',
    });

    const updated = await schoolsService.updateProfile(school.id, {
      name: 'Beacon Hill Global Academy',
      address: 'New Address 200, Innovation Way',
      contactEmail: 'admissions@beaconhill.edu',
      contactPhone: '9876543210',
    });

    expect(updated.name).toBe('Beacon Hill Global Academy');
    expect(updated.address).toBe('New Address 200, Innovation Way');
    expect(updated.contactEmail).toBe('admissions@beaconhill.edu');
    expect(updated.schoolUuid).toBe(school.schoolUuid); // Immutable
  });

  it('[VT-001-012] Reject invalid logo file exceeding 2MB or invalid MIME', async () => {
    const school = await schoolsService.createSchool({ name: 'Pinecrest Academy' });

    // 1. Create file with invalid MIME
    const badMimeFile = await schoolFileRepository.create({
      id: 'file-bad-mime-1',
      schoolId: school.id,
      category: 'LOGO',
      fileName: 'script.js',
      fileSizeBytes: 1024,
      mimeType: 'application/javascript',
      storageKey: 'tenants/pinecrest/script.js',
      uploadedBy: '00000000-0000-0000-0000-000000000001',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    await expect(
      schoolsService.updateProfile(school.id, { logoFileId: badMimeFile.id }),
    ).rejects.toThrow(UnprocessableEntityException);

    // 2. Create file exceeding 2MB (2097152 bytes)
    const oversizedFile = await schoolFileRepository.create({
      id: 'file-oversized-1',
      schoolId: school.id,
      category: 'LOGO',
      fileName: 'large-logo.png',
      fileSizeBytes: 3 * 1024 * 1024, // 3MB
      mimeType: 'image/png',
      storageKey: 'tenants/pinecrest/large.png',
      uploadedBy: '00000000-0000-0000-0000-000000000001',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    await expect(
      schoolsService.updateProfile(school.id, { logoFileId: oversizedFile.id }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('[VT-001-013] Save valid principal details and signature image', async () => {
    const school = await schoolsService.createSchool({ name: 'Westminster School' });

    // Valid signature file
    const sigFile = await schoolFileRepository.create({
      id: 'sig-file-101',
      schoolId: school.id,
      category: 'SIGNATURE',
      fileName: 'signature.png',
      fileSizeBytes: 150 * 1024, // 150 KB
      mimeType: 'image/png',
      storageKey: 'tenants/westminster/sig.png',
      uploadedBy: '00000000-0000-0000-0000-000000000001',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const updated = await schoolsService.updatePrincipal(school.id, {
      principalName: 'Dr. Rebecca Vance',
      contactNumber: '9876543210',
      signatureFileId: sigFile.id,
    });

    expect(updated.principalName).toBe('Dr. Rebecca Vance');
    expect(updated.principalContactNumber).toBe('9876543210');
    expect(updated.principalSignatureFileId).toBe(sigFile.id);
  });

  it('[VT-001-014] Reject invalid principal contact number not matching 10 digits', async () => {
    const school = await schoolsService.createSchool({ name: 'Oakfield College' });

    // Non-10-digit phone
    await expect(
      schoolsService.updatePrincipal(school.id, { contactNumber: '12345' }),
    ).rejects.toThrow(UnprocessableEntityException);

    await expect(
      schoolsService.updatePrincipal(school.id, { contactNumber: '98765432109999' }),
    ).rejects.toThrow(UnprocessableEntityException);

    await expect(
      schoolsService.updatePrincipal(school.id, { contactNumber: 'abcdefghij' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('[VT-001-015] Block cross-school file pointer injection', async () => {
    const schoolA = await schoolsService.createSchool({ name: 'School Alpha' });
    const schoolB = await schoolsService.createSchool({ name: 'School Beta' });

    // File uploaded for School B
    const fileBelongingToSchoolB = await schoolFileRepository.create({
      id: 'file-school-b',
      schoolId: schoolB.id,
      category: 'LOGO',
      fileName: 'beta-logo.png',
      fileSizeBytes: 2048,
      mimeType: 'image/png',
      storageKey: 'tenants/school-b/beta.png',
      uploadedBy: '00000000-0000-0000-0000-000000000001',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    // School A attempts to reference School B's file
    await expect(
      schoolsService.updateProfile(schoolA.id, {
        logoFileId: fileBelongingToSchoolB.id,
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    // School A attempts to reference School B's signature
    await expect(
      schoolsService.updatePrincipal(schoolA.id, {
        signatureFileId: fileBelongingToSchoolB.id,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('[VT-001-016] Direct upload of School Logo updates school branding', async () => {
    const minioAdapter = new (require('../../platform-foundation/adapters/minio-object-storage.adapter').MinioObjectStorageAdapter)();
    const objectStorageService = new (require('../../platform-foundation/services/object-storage.service').ObjectStorageService)(
      schoolFileRepository,
      minioAdapter,
    );
    const serviceWithStorage = new SchoolsService(
      schoolsRepository,
      new (require('../../platform-foundation/services/audit.service').AuditService)(new (require('../../platform-foundation/repositories/audit-log.repository').AuditLogRepository)()),
      schoolFileRepository,
      undefined,
      objectStorageService,
    );

    const school = await serviceWithStorage.createSchool({ name: 'Highland Crest' });
    const dummyPngBase64 = Buffer.from('fake-png-binary-content').toString('base64');

    const result = await serviceWithStorage.uploadLogo(school.id, {
      fileName: 'crest.png',
      mimeType: 'image/png',
      dataUrlOrBase64: `data:image/png;base64,${dummyPngBase64}`,
    });

    expect(result.file.id).toBeDefined();
    expect(result.school.logoFileId).toBe(result.file.id);

    const fetchedSchool = await serviceWithStorage.getSchoolById(school.id);
    expect(fetchedSchool.logoFileId).toBe(result.file.id);
  });

  it('[VT-001-017] Direct upload of Principal Signature updates authorized signatory', async () => {
    const minioAdapter = new (require('../../platform-foundation/adapters/minio-object-storage.adapter').MinioObjectStorageAdapter)();
    const objectStorageService = new (require('../../platform-foundation/services/object-storage.service').ObjectStorageService)(
      schoolFileRepository,
      minioAdapter,
    );
    const serviceWithStorage = new SchoolsService(
      schoolsRepository,
      new (require('../../platform-foundation/services/audit.service').AuditService)(new (require('../../platform-foundation/repositories/audit-log.repository').AuditLogRepository)()),
      schoolFileRepository,
      undefined,
      objectStorageService,
    );

    const school = await serviceWithStorage.createSchool({ name: 'Oxford Crest' });
    const dummyPngBase64 = Buffer.from('fake-signature-binary-content').toString('base64');

    const result = await serviceWithStorage.uploadPrincipalSignature(school.id, {
      fileName: 'signature.png',
      mimeType: 'image/png',
      dataUrlOrBase64: `data:image/png;base64,${dummyPngBase64}`,
    });

    expect(result.file.id).toBeDefined();
    expect(result.school.principalSignatureFileId).toBe(result.file.id);

    const fetchedSchool = await serviceWithStorage.getSchoolById(school.id);
    expect(fetchedSchool.principalSignatureFileId).toBe(result.file.id);
  });
});
