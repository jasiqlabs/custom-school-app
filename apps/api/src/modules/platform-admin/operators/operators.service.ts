import {
  Injectable,
  ConflictException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { UsersRepository } from '../users.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { UserSessionRepository } from '../../platform-foundation/repositories/user-session.repository';
import {
  MOD_001_ERRORS,
  ProvisionOperatorRequest,
  SchoolOperatorItem,
} from '@custom-school/contracts';

@Injectable()
export class OperatorsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly schoolsRepository: SchoolsRepository,
    private readonly auditService: AuditService,
    @Optional() private readonly userSessionRepository?: UserSessionRepository,
  ) {}

  async provisionOperator(
    schoolId: string,
    dto: ProvisionOperatorRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<SchoolOperatorItem> {
    const school = await this.schoolsRepository.findById(schoolId);
    if (!school) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'School tenant not found.',
      });
    }

    if (school.status !== 'ACTIVE') {
      throw new ConflictException({
        code: MOD_001_ERRORS.ERR_SCHOOL_NOT_ACTIVE,
        message: 'Operators can only be provisioned for active schools.',
      });
    }

    const existingUser = await this.usersRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException({
        code: MOD_001_ERRORS.ERR_DUPLICATE_OPERATOR_EMAIL,
        message: 'An account with this email address already exists.',
      });
    }

    // Hash with Argon2id
    const passwordHash = await argon2.hash(dto.temporaryPassword, {
      type: argon2.argon2id,
    });

    const user = await this.usersRepository.create({
      fullName: dto.fullName.trim(),
      email: dto.email.trim().toLowerCase(),
      passwordHash,
      role: 'SCHOOL_OPERATOR',
      schoolId: school.id,
      status: 'ACTIVE',
    });

    // Audit log without temporaryPassword
    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId: school.id,
      action: 'OPERATOR_PROVISIONED',
      resourceType: 'OPERATOR',
      resourceId: user.id,
      metadata: {
        operatorEmail: user.email,
        fullName: user.fullName,
      },
    });

    return {
      id: user.id,
      schoolId: school.id,
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async listOperators(schoolId: string): Promise<SchoolOperatorItem[]> {
    const school = await this.schoolsRepository.findById(schoolId);
    if (!school) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'School tenant not found.',
      });
    }

    const users = await this.usersRepository.findBySchoolId(schoolId);
    return users.map((u) => ({
      id: u.id,
      schoolId: u.schoolId!,
      userId: u.id,
      fullName: u.fullName,
      email: u.email,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async updateOperatorStatus(
    schoolId: string,
    operatorId: string,
    status: 'ACTIVE' | 'INACTIVE' | 'LOCKED',
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<SchoolOperatorItem> {
    const user = await this.usersRepository.findById(operatorId);
    if (!user || user.schoolId !== schoolId) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'Operator account not found in this school tenant.',
      });
    }

    const updated = await this.usersRepository.update(operatorId, { status });

    if (status !== 'ACTIVE' && this.userSessionRepository) {
      // Revoke any existing sessions for this operator
      await this.userSessionRepository.revokeAllForSchool(schoolId);
    }

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId,
      action: 'OPERATOR_STATUS_CHANGED',
      resourceType: 'OPERATOR',
      resourceId: operatorId,
      metadata: {
        previousStatus: user.status,
        newStatus: status,
      },
    });

    return {
      id: updated!.id,
      schoolId: updated!.schoolId!,
      userId: updated!.id,
      fullName: updated!.fullName,
      email: updated!.email,
      status: updated!.status,
      createdAt: updated!.createdAt.toISOString(),
    };
  }
}
