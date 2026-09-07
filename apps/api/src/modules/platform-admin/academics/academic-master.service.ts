import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { AcademicsRepository, ClassEntity, SectionEntity } from './academics.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import {
  MOD_001_ERRORS,
  CreateClassRequest,
  UpdateClassRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
} from '@custom-school/contracts';

@Injectable()
export class AcademicMasterService {
  constructor(
    private readonly academicsRepository: AcademicsRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly auditService: AuditService,
  ) {}

  private async assertSchoolExists(schoolId: string) {
    const school = await this.schoolsRepository.findById(schoolId);
    if (!school) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'School tenant not found.',
      });
    }
    return school;
  }

  // --- Class Operations ---
  async createClass(
    schoolId: string,
    dto: CreateClassRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<ClassEntity> {
    await this.assertSchoolExists(schoolId);

    const existing = await this.academicsRepository.findClassBySchoolAndName(schoolId, dto.name);
    if (existing) {
      throw new ConflictException({
        code: MOD_001_ERRORS.ERR_ACADEMIC_DUPLICATE,
        message: `A class named "${dto.name}" already exists in this school.`,
      });
    }

    const created = await this.academicsRepository.createClass({
      schoolId,
      name: dto.name,
      displayOrder: dto.displayOrder,
    });

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'CLASS_CREATED',
      resourceType: 'CLASS',
      resourceId: created.id,
      metadata: { name: created.name },
    });

    return created;
  }

  async listClasses(schoolId: string) {
    await this.assertSchoolExists(schoolId);
    const classes = await this.academicsRepository.findClassesBySchool(schoolId);
    const result = [];

    for (const c of classes) {
      const sections = await this.academicsRepository.findSectionsByClass(c.id);
      result.push({
        ...c,
        sections,
      });
    }

    return result;
  }

  async updateClass(
    schoolId: string,
    classId: string,
    dto: UpdateClassRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<ClassEntity> {
    await this.assertSchoolExists(schoolId);
    const cls = await this.academicsRepository.findClassById(classId);
    if (!cls || cls.schoolId !== schoolId) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'Class not found in this school tenant.',
      });
    }

    if (dto.name && dto.name.trim().toLowerCase() !== cls.name.toLowerCase()) {
      const duplicate = await this.academicsRepository.findClassBySchoolAndName(schoolId, dto.name);
      if (duplicate) {
        throw new ConflictException({
          code: MOD_001_ERRORS.ERR_ACADEMIC_DUPLICATE,
          message: `A class named "${dto.name}" already exists in this school.`,
        });
      }
    }

    const updated = await this.academicsRepository.updateClass(classId, {
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
      ...(dto.status ? { status: dto.status } : {}),
    });

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'CLASS_UPDATED',
      resourceType: 'CLASS',
      resourceId: classId,
      metadata: { status: updated?.status },
    });

    return updated!;
  }

  async deleteClass(
    schoolId: string,
    classId: string,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<void> {
    await this.assertSchoolExists(schoolId);
    const cls = await this.academicsRepository.findClassById(classId);
    if (!cls || cls.schoolId !== schoolId) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'Class not found in this school tenant.',
      });
    }

    // BR-CLS-002: Active enrollment blocks delete, allows deactivation
    const activeEnrollments = this.academicsRepository.getActiveEnrollmentCount(classId);
    if (activeEnrollments > 0) {
      throw new ConflictException({
        code: MOD_001_ERRORS.ERR_ACADEMIC_IN_USE,
        message: 'Class has active student enrollments and cannot be deleted. Deactivate instead.',
        canDeactivate: true,
      });
    }

    await this.academicsRepository.deleteClass(classId);

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'CLASS_DELETED',
      resourceType: 'CLASS',
      resourceId: classId,
    });
  }

  // --- Section Operations ---
  async createSection(
    schoolId: string,
    classId: string,
    dto: CreateSectionRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<SectionEntity> {
    await this.assertSchoolExists(schoolId);
    const cls = await this.academicsRepository.findClassById(classId);
    if (!cls || cls.schoolId !== schoolId) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'Class not found in this school tenant.',
      });
    }

    const duplicate = await this.academicsRepository.findSectionByClassAndName(
      schoolId,
      classId,
      dto.name,
    );
    if (duplicate) {
      throw new ConflictException({
        code: MOD_001_ERRORS.ERR_ACADEMIC_DUPLICATE,
        message: `A section named "${dto.name}" already exists in this class.`,
      });
    }

    const created = await this.academicsRepository.createSection({
      schoolId,
      classId,
      name: dto.name,
    });

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'SECTION_CREATED',
      resourceType: 'SECTION',
      resourceId: created.id,
      metadata: { classId, name: created.name },
    });

    return created;
  }

  async updateSection(
    schoolId: string,
    classId: string,
    sectionId: string,
    dto: UpdateSectionRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<SectionEntity> {
    await this.assertSchoolExists(schoolId);
    const section = await this.academicsRepository.findSectionById(sectionId);
    if (!section || section.schoolId !== schoolId || section.classId !== classId) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'Section not found under this class and school tenant.',
      });
    }

    if (dto.name && dto.name.trim().toLowerCase() !== section.name.toLowerCase()) {
      const duplicate = await this.academicsRepository.findSectionByClassAndName(
        schoolId,
        classId,
        dto.name,
      );
      if (duplicate) {
        throw new ConflictException({
          code: MOD_001_ERRORS.ERR_ACADEMIC_DUPLICATE,
          message: `A section named "${dto.name}" already exists in this class.`,
        });
      }
    }

    const updated = await this.academicsRepository.updateSection(sectionId, {
      ...(dto.name ? { name: dto.name.trim() } : {}),
      ...(dto.status ? { status: dto.status } : {}),
    });

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'SECTION_UPDATED',
      resourceType: 'SECTION',
      resourceId: sectionId,
      metadata: { status: updated?.status },
    });

    return updated!;
  }

  async deleteSection(
    schoolId: string,
    classId: string,
    sectionId: string,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<void> {
    await this.assertSchoolExists(schoolId);
    const section = await this.academicsRepository.findSectionById(sectionId);
    if (!section || section.schoolId !== schoolId || section.classId !== classId) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'Section not found under this class and school tenant.',
      });
    }

    // BR-CLS-002: Active enrollment blocks delete, allows deactivation
    const activeEnrollments = this.academicsRepository.getActiveEnrollmentCount(sectionId);
    if (activeEnrollments > 0) {
      throw new ConflictException({
        code: MOD_001_ERRORS.ERR_ACADEMIC_IN_USE,
        message: 'Section has active student enrollments and cannot be deleted. Deactivate instead.',
        canDeactivate: true,
      });
    }

    await this.academicsRepository.deleteSection(sectionId);

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'SECTION_DELETED',
      resourceType: 'SECTION',
      resourceId: sectionId,
    });
  }

  // --- Public Facade Integration ---
  async getActiveAcademicStructure(schoolId: string) {
    const classes = await this.academicsRepository.findClassesBySchool(schoolId);
    const activeClasses = classes.filter((c) => c.status === 'ACTIVE');
    const result = [];

    for (const c of activeClasses) {
      const sections = await this.academicsRepository.findSectionsByClass(c.id);
      const activeSections = sections
        .filter((s) => s.status === 'ACTIVE')
        .map((s) => ({ sectionId: s.id, name: s.name }));

      result.push({
        classId: c.id,
        className: c.name,
        sections: activeSections,
      });
    }

    return result;
  }
}
