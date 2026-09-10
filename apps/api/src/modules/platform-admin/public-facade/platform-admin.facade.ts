import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SessionSubjectRegistry } from '../../../platform/auth/session-subject.registry';
import { ApiError } from '../../../common/http/api-error';

@Injectable()
export class PlatformAdminPublicFacade implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly sessionSubjects: SessionSubjectRegistry) {}

  onModuleInit() {
    this.sessionSubjects.register('PLATFORM_ADMIN', async snapshot => {
      const user = await this.prisma.platformUser.findUnique({ where: { id: snapshot.userId }, select: { status: true, accountVersion: true } });
      return Boolean(user && user.status === 'ACTIVE' && user.accountVersion === snapshot.accountVersion && snapshot.schoolId === null);
    });
    this.sessionSubjects.register('OPERATOR', async snapshot => {
      if (!snapshot.schoolId) return false;
      const operator = await this.prisma.schoolOperator.findFirst({ where: { id: snapshot.userId, schoolId: snapshot.schoolId }, include: { school: { select: { status: true, accessVersion: true } } } });
      return Boolean(operator && operator.status === 'ACTIVE' && operator.accountVersion === snapshot.accountVersion && operator.school.status === 'ACTIVE' && operator.school.accessVersion === snapshot.schoolAccessVersion);
    });
  }

  async getSchoolIdentity(schoolId: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, status: true, accessVersion: true } });
    if (!school) throw new ApiError(404, 'ERR_SCHOOL_NOT_FOUND', 'School not found');
    return school;
  }

  async validateAcademicSelection(schoolId: string, classId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({ where: { id: sectionId, schoolId, classId, status: 'ACTIVE', class: { status: 'ACTIVE' } }, select: { id: true, classId: true } });
    if (!section) throw new ApiError(422, 'ERR_ACADEMIC_SELECTION', 'Class/Section selection is invalid or inactive');
    return section;
  }

  async getOperatorForAuth(email: string) {
    return this.prisma.schoolOperator.findUnique({ where: { email: email.trim().toLowerCase() }, include: { school: { select: { id: true, name: true, status: true, accessVersion: true } } } });
  }

  async recordOperatorLoginFailure(operatorId: string, maxFailures: number, lockMinutes: number) {
    const current = await this.prisma.schoolOperator.findUnique({ where: { id: operatorId }, select: { failedCount: true } });
    if (!current) return;
    const next = current.failedCount + 1;
    await this.prisma.schoolOperator.update({ where: { id: operatorId }, data: { failedCount: next, lockedUntil: next >= maxFailures ? new Date(Date.now() + lockMinutes * 60_000) : null } });
  }

  async withOperatorLoginGuard<T>(operatorId: string, action: (operator: {id:string;schoolId:string;email:string;fullName:string;status:string;accountVersion:number;school:{id:string;name:string;status:string;accessVersion:number}}, tx:any) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async tx => {
      await (tx as any).$queryRaw`SELECT id FROM school_operators WHERE id=${operatorId}::uuid FOR UPDATE`;
      const operator = await tx.schoolOperator.findUnique({ where: { id: operatorId }, include: { school: { select: { id: true, name: true, status: true, accessVersion: true } } } });
      if (!operator || operator.status !== 'ACTIVE' || operator.school.status !== 'ACTIVE') throw new ApiError(403, 'ERR_ACCOUNT_INACTIVE', 'Account is not available');
      await (tx as any).$queryRaw`SELECT id FROM schools WHERE id=${operator.schoolId}::uuid FOR SHARE`;
      const refreshed = await tx.schoolOperator.update({ where: { id: operator.id }, data: { failedCount: 0, lockedUntil: null }, include: { school: { select: { id: true, name: true, status: true, accessVersion: true } } } });
      return action(refreshed as any, tx);
    });
  }

  async getOperatorSessionIdentity(operatorId: string, schoolId: string) {
    return this.prisma.schoolOperator.findFirst({ where: { id: operatorId, schoolId }, include: { school: { select: { id: true, name: true, status: true, accessVersion: true } } } });
  }
}
