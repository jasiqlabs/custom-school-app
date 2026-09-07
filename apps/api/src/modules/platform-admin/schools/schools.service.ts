import {
  Injectable,
  ConflictException,
  UnprocessableEntityException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SchoolsRepository, SchoolEntity, FindSchoolsFilter } from './schools.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { SchoolFileRepository } from '../../platform-foundation/repositories/school-file.repository';
import { UserSessionRepository } from '../../platform-foundation/repositories/user-session.repository';
import { ObjectStorageService } from '../../platform-foundation/services/object-storage.service';
import {
  MOD_001_ERRORS,
  CreateSchoolRequest,
  UpdateSchoolProfileRequest,
  UpdatePrincipalRequest,
  ChangeSchoolStatusRequest,
} from '@custom-school/contracts';

@Injectable()
export class SchoolsService {
  private readonly MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MiB
  private readonly MAX_SIGNATURE_SIZE = 1 * 1024 * 1024; // 1 MiB
  private readonly ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg'];

  constructor(
    private readonly schoolsRepository: SchoolsRepository,
    private readonly auditService: AuditService,
    private readonly schoolFileRepository: SchoolFileRepository,
    @Optional() private readonly userSessionRepository?: UserSessionRepository,
    @Optional() private readonly objectStorageService?: ObjectStorageService,
  ) {}

  async createSchool(
    dto: CreateSchoolRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<SchoolEntity> {
    const trimmedName = (dto.name || '').trim();

    // 1. Validation: Name must be at least 2 characters
    if (trimmedName.length < 2) {
      throw new UnprocessableEntityException({
        code: MOD_001_ERRORS.ERR_SCHOOL_NAME_REQUIRED,
        message: 'School name must be at least 2 characters.',
      });
    }

    // 2. Duplicate Detection: Check for matching name
    const existing = await this.schoolsRepository.findByNameNormalized(trimmedName);
    if (existing && !dto.confirmDuplicateName) {
      throw new ConflictException({
        code: MOD_001_ERRORS.ERR_DUPLICATE_SCHOOL_CONFIRMATION_REQUIRED,
        message: 'A school with a matching name already exists. Please confirm to proceed.',
        matchedSchool: {
          id: existing.id,
          schoolUuid: existing.schoolUuid,
          name: existing.name,
        },
      });
    }

    // 3. Create Draft School with immutable UUID
    const school = await this.schoolsRepository.create({
      name: trimmedName,
      code: dto.code,
      address: dto.address,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
    });

    // 4. Record Audit
    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId: school.id,
      action: 'SCHOOL_CREATED',
      resourceType: 'SCHOOL',
      resourceId: school.id,
      metadata: {
        schoolUuid: school.schoolUuid,
        name: school.name,
        status: school.status,
      },
    });

    return school;
  }

  async listSchools(filter: FindSchoolsFilter) {
    const result = await this.schoolsRepository.findAll(filter);
    return {
      items: result.items.map((s) => ({
        id: s.id,
        schoolUuid: s.schoolUuid,
        name: s.name,
        code: s.code,
        status: s.status,
        address: s.address,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        principalName: s.principalName,
        studentCount: null,
        studentCountState: 'UNAVAILABLE' as const,
        createdAt: s.createdAt.toISOString(),
      })),
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
  }

  async getSchoolById(id: string): Promise<SchoolEntity> {
    const school = await this.schoolsRepository.findById(id);
    if (!school) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'School not found.',
      });
    }
    return school;
  }

  async updateProfile(
    schoolId: string,
    dto: UpdateSchoolProfileRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<SchoolEntity> {
    const school = await this.getSchoolById(schoolId);

    if (dto.name !== undefined && dto.name.trim().length < 2) {
      throw new UnprocessableEntityException({
        code: MOD_001_ERRORS.ERR_SCHOOL_NAME_REQUIRED,
        message: 'School name must be at least 2 characters.',
      });
    }

    // Logo verification if provided
    if (dto.logoFileId) {
      const file = await this.schoolFileRepository.findById(dto.logoFileId);
      if (!file || file.schoolId !== schoolId) {
        throw new UnprocessableEntityException({
          code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
          message: 'Logo file not found in this school tenant scope.',
        });
      }
      if (!this.ALLOWED_MIME.includes(file.mimeType) || file.fileSizeBytes > this.MAX_LOGO_SIZE) {
        throw new UnprocessableEntityException({
          code: 'ERR_INVALID_FILE_SPEC',
          message: 'Logo must be a PNG or JPEG under 2 MiB.',
        });
      }
    }

    const updated = await this.schoolsRepository.update(schoolId, {
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail } : {}),
      ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone } : {}),
      ...(dto.logoFileId !== undefined ? { logoFileId: dto.logoFileId } : {}),
    });

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'SCHOOL_PROFILE_UPDATED',
      resourceType: 'SCHOOL',
      resourceId: schoolId,
    });

    return updated!;
  }

  async updatePrincipal(
    schoolId: string,
    dto: UpdatePrincipalRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<SchoolEntity> {
    await this.getSchoolById(schoolId);

    if (dto.contactNumber && !/^\d{10}$/.test(dto.contactNumber)) {
      throw new UnprocessableEntityException({
        code: 'ERR_INVALID_PHONE_NUMBER',
        message: 'Contact number must be exactly 10 digits.',
      });
    }

    // Signature verification if provided
    if (dto.signatureFileId) {
      const file = await this.schoolFileRepository.findById(dto.signatureFileId);
      if (!file || file.schoolId !== schoolId) {
        throw new UnprocessableEntityException({
          code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
          message: 'Signature file not found in this school tenant scope.',
        });
      }
      if (!this.ALLOWED_MIME.includes(file.mimeType) || file.fileSizeBytes > this.MAX_SIGNATURE_SIZE) {
        throw new UnprocessableEntityException({
          code: 'ERR_INVALID_FILE_SPEC',
          message: 'Signature must be a PNG or JPEG under 1 MiB.',
        });
      }
    }

    const updated = await this.schoolsRepository.update(schoolId, {
      ...(dto.principalName !== undefined ? { principalName: dto.principalName } : {}),
      ...(dto.contactNumber !== undefined ? { principalContactNumber: dto.contactNumber } : {}),
      ...(dto.signatureFileId !== undefined ? { principalSignatureFileId: dto.signatureFileId } : {}),
    });

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'PRINCIPAL_UPDATED',
      resourceType: 'SCHOOL_PRINCIPAL',
      resourceId: schoolId,
    });

    return updated!;
  }

  async changeStatus(
    schoolId: string,
    dto: ChangeSchoolStatusRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<SchoolEntity> {
    const school = await this.getSchoolById(schoolId);

    if (dto.status === 'ACTIVE') {
      if (!school.name || school.name.trim().length < 2) {
        throw new UnprocessableEntityException({
          code: MOD_001_ERRORS.ERR_SCHOOL_NAME_REQUIRED,
          message: 'School name must be at least 2 characters before activation.',
        });
      }
    }

    if (dto.status === 'INACTIVE') {
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new UnprocessableEntityException({
          code: 'ERR_REASON_REQUIRED',
          message: 'Reason is required when deactivating a school.',
        });
      }

      // VT-001-025: Deactivated school revokes operator sessions immediately
      if (this.userSessionRepository) {
        await this.userSessionRepository.revokeAllForSchool(schoolId);
      }
    }

    const updated = await this.schoolsRepository.update(schoolId, {
      status: dto.status,
    });

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'SCHOOL_STATUS_CHANGED',
      resourceType: 'SCHOOL',
      resourceId: schoolId,
      metadata: {
        previousStatus: school.status,
        newStatus: dto.status,
        reason: dto.reason || null,
      },
    });

    return updated!;
  }

  async uploadLogo(
    schoolId: string,
    payload: { fileName: string; mimeType: string; dataUrlOrBase64: string },
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ) {
    await this.getSchoolById(schoolId);

    let base64 = payload.dataUrlOrBase64;
    if (base64.includes(',')) {
      base64 = base64.split(',')[1];
    }
    const buffer = Buffer.from(base64, 'base64');

    if (!this.ALLOWED_MIME.includes(payload.mimeType) || buffer.length > this.MAX_LOGO_SIZE) {
      throw new UnprocessableEntityException({
        code: 'ERR_INVALID_FILE_SPEC',
        message: 'Logo must be a PNG or JPEG under 2 MiB.',
      });
    }

    if (!this.objectStorageService) {
      throw new UnprocessableEntityException('Storage service not initialized');
    }

    const file = await this.objectStorageService.putSchoolFile({
      schoolId,
      category: 'LOGO',
      fileName: payload.fileName || 'school_logo.png',
      fileSizeBytes: buffer.length,
      mimeType: payload.mimeType,
      contentBuffer: buffer,
      uploadedBy: actorId || 'platform-admin',
    });

    const updatedSchool = await this.updateProfile(schoolId, { logoFileId: file.id }, actorId, requestId);

    return {
      file,
      school: updatedSchool,
    };
  }

  async uploadPrincipalSignature(
    schoolId: string,
    payload: { fileName: string; mimeType: string; dataUrlOrBase64: string },
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ) {
    await this.getSchoolById(schoolId);

    let base64 = payload.dataUrlOrBase64;
    if (base64.includes(',')) {
      base64 = base64.split(',')[1];
    }
    const buffer = Buffer.from(base64, 'base64');

    if (!this.ALLOWED_MIME.includes(payload.mimeType) || buffer.length > this.MAX_SIGNATURE_SIZE) {
      throw new UnprocessableEntityException({
        code: 'ERR_INVALID_FILE_SPEC',
        message: 'Signature must be a PNG or JPEG under 1 MiB.',
      });
    }

    if (!this.objectStorageService) {
      throw new UnprocessableEntityException('Storage service not initialized');
    }

    const file = await this.objectStorageService.putSchoolFile({
      schoolId,
      category: 'SIGNATURE',
      fileName: payload.fileName || 'principal_signature.png',
      fileSizeBytes: buffer.length,
      mimeType: payload.mimeType,
      contentBuffer: buffer,
      uploadedBy: actorId || 'platform-admin',
    });

    const updatedSchool = await this.updatePrincipal(schoolId, { signatureFileId: file.id }, actorId, requestId);

    return {
      file,
      school: updatedSchool,
    };
  }

  async getFileBuffer(schoolId: string, fileId: string) {
    if (!this.objectStorageService) {
      throw new NotFoundException('Storage service not initialized');
    }
    return this.objectStorageService.getFileBuffer(schoolId, fileId);
  }
}
