import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { ApiError } from '../../../common/http/api-error';
import { FeesPublicFacadeImpl } from '../../fees/facade/fees-public.facade';
import type {
  SessionActor,
  CreateExamContextInput,
  UpdateExamContextInput,
  ExamCardContextDto,
  ExamStudentClearanceDto,
  ExamContextStatus,
} from '@custom-school/contracts';

@Injectable()
export class ExamContextsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly feesFacade: FeesPublicFacadeImpl
  ) {}

  private async assertSchoolActive(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, status: true },
    });
    if (!school) throw new ApiError(404, 'ERR_SCHOOL_NOT_FOUND', 'School not found');
    if (school.status !== 'ACTIVE') throw new ApiError(409, 'ERR_SCHOOL_NOT_ACTIVE', 'School must be active');
    return school;
  }

  async create(actor: SessionActor, schoolId: string, input: CreateExamContextInput): Promise<ExamCardContextDto> {
    await this.assertSchoolActive(schoolId);

    // Validate academic session
    const session = await this.prisma.academicSession.findFirst({
      where: { id: input.academicSessionId, schoolId },
    });
    if (!session) throw new ApiError(404, 'ERR_SESSION_NOT_FOUND', 'Academic session not found for this school');

    // Validate class
    const cls = await this.prisma.class.findFirst({
      where: { id: input.classId, schoolId },
    });
    if (!cls) throw new ApiError(404, 'ERR_CLASS_NOT_FOUND', 'Class not found for this school');

    if (input.examEnd < input.examStart) {
      throw new ApiError(422, 'ERR_INVALID_DATES', 'Exam end date must be on or after exam start date');
    }

    // Check unique code if provided
    if (input.examCode) {
      const existing = await this.prisma.examCardContext.findFirst({
        where: {
          schoolId,
          academicSessionId: input.academicSessionId,
          classId: input.classId,
          examCode: input.examCode,
        },
      });
      if (existing) {
        throw new ApiError(409, 'ERR_EXAM_CODE_DUPLICATE', 'An exam with this code already exists for this class and session');
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.examCardContext.create({
        data: {
          schoolId,
          academicSessionId: input.academicSessionId,
          classId: input.classId,
          title: input.title.trim(),
          examCode: input.examCode?.trim() || null,
          examStart: new Date(input.examStart),
          examEnd: new Date(input.examEnd),
          venue: input.venue?.trim() || null,
          instructions: input.instructions?.trim() || null,
          status: 'DRAFT',
          version: 1,
          createdBy: actor.userId,
        },
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'EXAM_CONTEXT_CREATED',
          targetType: 'EXAM_CONTEXT',
          targetId: created.id,
          metadata: {
            title: created.title,
            classId: created.classId,
            academicSessionId: created.academicSessionId,
          },
        },
        tx as any
      );

      return created;
    });

    return {
      id: row.id,
      schoolId: row.schoolId,
      academicSessionId: row.academicSessionId,
      academicSessionLabel: session.label,
      classId: row.classId,
      className: cls.name,
      title: row.title,
      examCode: row.examCode,
      examStart: row.examStart.toISOString().slice(0, 10),
      examEnd: row.examEnd.toISOString().slice(0, 10),
      venue: row.venue,
      instructions: row.instructions,
      status: row.status as ExamContextStatus,
      version: row.version,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      studentCount: 0,
      issuedCount: 0,
    };
  }

  async list(
    schoolId: string,
    filter: { academicSessionId?: string; classId?: string; status?: ExamContextStatus }
  ): Promise<ExamCardContextDto[]> {
    await this.assertSchoolActive(schoolId);

    const rows = await this.prisma.examCardContext.findMany({
      where: {
        schoolId,
        ...(filter.academicSessionId ? { academicSessionId: filter.academicSessionId } : {}),
        ...(filter.classId ? { classId: filter.classId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      include: {
        academicSession: { select: { label: true } },
        class: { select: { name: true } },
        _count: {
          select: {
            admitCardIssues: true,
          },
        },
      },
      orderBy: [{ examStart: 'desc' }, { createdAt: 'desc' }],
    });

    // Populate student count dynamically
    return Promise.all(
      rows.map(async (r) => {
        const studentCount = await this.prisma.studentEnrollment.count({
          where: {
            schoolId,
            academicSessionId: r.academicSessionId,
            classId: r.classId,
            status: 'ACTIVE',
            student: { status: 'ACTIVE' },
          },
        });

        return {
          id: r.id,
          schoolId: r.schoolId,
          academicSessionId: r.academicSessionId,
          academicSessionLabel: r.academicSession.label,
          classId: r.classId,
          className: r.class.name,
          title: r.title,
          examCode: r.examCode,
          examStart: r.examStart.toISOString().slice(0, 10),
          examEnd: r.examEnd.toISOString().slice(0, 10),
          venue: r.venue,
          instructions: r.instructions,
          status: r.status as ExamContextStatus,
          version: r.version,
          createdBy: r.createdBy,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          studentCount,
          issuedCount: r._count.admitCardIssues,
        };
      })
    );
  }

  async get(schoolId: string, id: string): Promise<ExamCardContextDto> {
    await this.assertSchoolActive(schoolId);

    const r = await this.prisma.examCardContext.findFirst({
      where: { id, schoolId },
      include: {
        academicSession: { select: { label: true } },
        class: { select: { name: true } },
        _count: {
          select: {
            admitCardIssues: true,
          },
        },
      },
    });

    if (!r) throw new ApiError(404, 'ERR_EXAM_CONTEXT_NOT_FOUND', 'Exam context not found');

    const studentCount = await this.prisma.studentEnrollment.count({
      where: {
        schoolId,
        academicSessionId: r.academicSessionId,
        classId: r.classId,
        status: 'ACTIVE',
        student: { status: 'ACTIVE' },
      },
    });

    return {
      id: r.id,
      schoolId: r.schoolId,
      academicSessionId: r.academicSessionId,
      academicSessionLabel: r.academicSession.label,
      classId: r.classId,
      className: r.class.name,
      title: r.title,
      examCode: r.examCode,
      examStart: r.examStart.toISOString().slice(0, 10),
      examEnd: r.examEnd.toISOString().slice(0, 10),
      venue: r.venue,
      instructions: r.instructions,
      status: r.status as ExamContextStatus,
      version: r.version,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      studentCount,
      issuedCount: r._count.admitCardIssues,
    };
  }

  async update(
    actor: SessionActor,
    schoolId: string,
    id: string,
    input: UpdateExamContextInput
  ): Promise<ExamCardContextDto> {
    await this.assertSchoolActive(schoolId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.examCardContext.findFirst({
        where: { id, schoolId },
        include: {
          academicSession: { select: { label: true } },
          class: { select: { name: true } },
        },
      });

      if (!current) throw new ApiError(404, 'ERR_EXAM_CONTEXT_NOT_FOUND', 'Exam context not found');

      // Optimistic concurrency check
      if (current.version !== input.version) {
        throw new ApiError(
          409,
          'ERR_EXAM_CONTEXT_STALE',
          `Concurrent modification detected: record is at version ${current.version}, expected ${input.version}`
        );
      }

      const examStart = input.examStart ? new Date(input.examStart) : current.examStart;
      const examEnd = input.examEnd ? new Date(input.examEnd) : current.examEnd;
      if (examEnd < examStart) {
        throw new ApiError(422, 'ERR_INVALID_DATES', 'Exam end date must be on or after exam start date');
      }

      const data: any = {
        version: current.version + 1,
        examStart,
        examEnd,
      };

      if (input.title !== undefined) data.title = input.title.trim();
      if (input.examCode !== undefined) data.examCode = input.examCode?.trim() || null;
      if (input.venue !== undefined) data.venue = input.venue?.trim() || null;
      if (input.instructions !== undefined) data.instructions = input.instructions?.trim() || null;
      if (input.status !== undefined) data.status = input.status;

      const row = await tx.examCardContext.update({
        where: { id: current.id },
        data,
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'EXAM_CONTEXT_UPDATED',
          targetType: 'EXAM_CONTEXT',
          targetId: row.id,
          metadata: {
            title: row.title,
            status: row.status,
            version: row.version,
          },
        },
        tx as any
      );

      return { row, academicSession: current.academicSession, class: current.class };
    });

    const issuedCount = await this.prisma.admitCardIssue.count({ where: { examContextId: id } });
    const studentCount = await this.prisma.studentEnrollment.count({
      where: {
        schoolId,
        academicSessionId: updated.row.academicSessionId,
        classId: updated.row.classId,
        status: 'ACTIVE',
        student: { status: 'ACTIVE' },
      },
    });

    return {
      id: updated.row.id,
      schoolId: updated.row.schoolId,
      academicSessionId: updated.row.academicSessionId,
      academicSessionLabel: updated.academicSession.label,
      classId: updated.row.classId,
      className: updated.class.name,
      title: updated.row.title,
      examCode: updated.row.examCode,
      examStart: updated.row.examStart.toISOString().slice(0, 10),
      examEnd: updated.row.examEnd.toISOString().slice(0, 10),
      venue: updated.row.venue,
      instructions: updated.row.instructions,
      status: updated.row.status as ExamContextStatus,
      version: updated.row.version,
      createdBy: updated.row.createdBy,
      createdAt: updated.row.createdAt.toISOString(),
      updatedAt: updated.row.updatedAt.toISOString(),
      studentCount,
      issuedCount,
    };
  }

  async getStudentsWithClearance(schoolId: string, examContextId: string): Promise<ExamStudentClearanceDto[]> {
    await this.assertSchoolActive(schoolId);

    const exam = await this.prisma.examCardContext.findFirst({
      where: { id: examContextId, schoolId },
    });
    if (!exam) throw new ApiError(404, 'ERR_EXAM_CONTEXT_NOT_FOUND', 'Exam context not found');

    // Fetch active enrollments for this class and academic session
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicSessionId: exam.academicSessionId,
        classId: exam.classId,
        status: 'ACTIVE',
        student: { status: 'ACTIVE' },
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
          },
        },
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
      orderBy: [{ student: { fullName: 'asc' } }],
    });

    // Fetch existing admit card issues for this exam
    const issues = await this.prisma.admitCardIssue.findMany({
      where: {
        schoolId,
        examContextId,
      },
      select: {
        id: true,
        cardUuid: true,
        studentId: true,
        status: true,
        fileId: true,
        issuedAt: true,
      },
    });
    const issueMap = new Map(issues.map((i) => [i.studentId, i]));

    // Check fee clearance for each student concurrently
    return Promise.all(
      enrollments.map(async (enr) => {
        const student = enr.student;
        let clearance: any = { cleared: true, totalOutstanding: 0, reasons: [], unpaidItems: [] };
        try {
          clearance = await this.feesFacade.checkStudentDocumentClearance({
            schoolId,
            studentId: student.id,
          });
        } catch (err: any) {
          clearance = {
            cleared: false,
            totalOutstanding: 0,
            reasons: ['Fee verification temporarily unavailable'],
            unpaidItems: [],
          };
        }

        const issue = issueMap.get(student.id);

        return {
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          className: enr.class?.name || 'Unassigned',
          sectionName: enr.section?.name || 'Unassigned',
          isFeeCleared: clearance.cleared,
          outstandingBalance: clearance.totalOutstanding,
          blockedReason: clearance.cleared ? null : clearance.reasons[0] || 'Outstanding fees pending',
          unpaidItems: clearance.unpaidItems,
          issueStatus: (issue?.status as any) || null,
          issueId: issue?.id || null,
          cardUuid: issue?.cardUuid || null,
          issuedAt: issue?.issuedAt ? issue.issuedAt.toISOString() : null,
          fileAvailable: Boolean(issue?.fileId),
        };
      })
    );
  }
}
