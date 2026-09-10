import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { StudentsPublicFacade } from '@custom-school/contracts';
import { STUDENTS_PUBLIC_FACADE } from '../students-port/students.port';
import { AuditService } from '../../../platform/audit/audit.service';
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly audit:AuditService, @Inject(STUDENTS_PUBLIC_FACADE) private readonly students: StudentsPublicFacade) {}
  async metrics() { const [total, active, inactive] = await Promise.all([this.prisma.school.count(), this.prisma.school.count({ where: { status: 'ACTIVE' } }), this.prisma.school.count({ where: { status: 'INACTIVE' } })]); return { totalSchools: total, activeSchools: active, inactiveSchools: inactive, draftSchools: total - active - inactive }; }
  async schools(page = 1, pageSize = 20) { const take = Math.min(100, Math.max(1, pageSize)); const safe = Math.max(1, page); const [total, rows] = await this.prisma.$transaction([this.prisma.school.count(), this.prisma.school.findMany({ orderBy: { createdAt: 'desc' }, skip: (safe - 1) * take, take, include: { _count: { select: { operators: true } } } })]); const items = await Promise.all(rows.map(async s => { const [population,lastAudit] = await Promise.all([this.students.getSchoolPopulationSummary({ schoolId: s.id }).catch(() => ({ availability: 'UNAVAILABLE' as const })),this.audit.latestForSchool(s.id)]); return { id: s.id, name: s.name, status: s.status, operatorCount: s._count.operators, studentCount: population.availability === 'AVAILABLE' ? population.activeStudents : null, studentCountAvailability: population.availability, lastActivityAt: lastAudit?.occurredAt ?? s.updatedAt }; })); return { items, total, page: safe, pageSize: take, pages: Math.ceil(total / take) }; }
}
