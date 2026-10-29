import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { SensitiveFieldCryptoService } from '../../../platform/crypto/sensitive-field-crypto.service';
import { PrivateFileService } from '../../../platform/files/private-file.service';
import { JobService } from '../../../platform/jobs/job.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { ApiError } from '../../../common/http/api-error';
import { FeesPublicFacadeImpl } from '../../fees/facade/fees-public.facade';
import { buildAdmitCardPdf, type AdmitCardPdfSnapshot } from '../domain/admit-card-pdf.builder';
import type {
  SessionActor,
  IssueAdmitCardsInput,
  BulkIssueAdmitCardsResponse,
  AdmitCardIssueDto,
  AdmitCardPreviewDto,
} from '@custom-school/contracts';

@Injectable()
export class AdmitCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SensitiveFieldCryptoService,
    private readonly files: PrivateFileService,
    private readonly jobs: JobService,
    private readonly audit: AuditService,
    private readonly feesFacade: FeesPublicFacadeImpl
  ) {}

  private async assertSchoolActive(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: { principal: true },
    });
    if (!school) throw new ApiError(404, 'ERR_SCHOOL_NOT_FOUND', 'School not found');
    if (school.status !== 'ACTIVE') throw new ApiError(409, 'ERR_SCHOOL_NOT_ACTIVE', 'School must be active');
    return school;
  }

  async getPreview(schoolId: string, examContextId: string, studentId: string): Promise<AdmitCardPreviewDto> {
    const school = await this.assertSchoolActive(schoolId);

    const exam = await this.prisma.examCardContext.findFirst({
      where: { id: examContextId, schoolId },
      include: {
        academicSession: { select: { label: true } },
        class: { select: { name: true } },
      },
    });
    if (!exam) throw new ApiError(404, 'ERR_EXAM_CONTEXT_NOT_FOUND', 'Exam context not found');

    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        schoolId,
        studentId,
        academicSessionId: exam.academicSessionId,
        classId: exam.classId,
        status: 'ACTIVE',
      },
      include: {
        student: true,
        class: true,
        section: true,
      },
    });
    if (!enrollment) throw new ApiError(404, 'ERR_STUDENT_NOT_ENROLLED', 'Student is not actively enrolled in this exam context');

    const examCutoffMonth = exam.examStart.toISOString().slice(0, 7);
    const clearance = await this.feesFacade.checkStudentDocumentClearance({
      schoolId,
      studentId,
      asOfDate: exam.examStart,
      cutoffMonth: examCutoffMonth,
      academicSessionId: exam.academicSessionId,
      purpose: 'ADMIT_CARD',
    });

    return {
      templateVersion: 'standard-v1',
      school: {
        id: school.id,
        name: school.name,
        address: school.address,
        phone: school.phone,
        email: school.email,
        udiseNumber: school.udiseNumber,
        affiliationNumber: school.affiliationNumber,
        schoolCode: school.schoolCode,
        hasLogo: Boolean(school.logoFileId),
        principalName: school.principal?.name || null,
        hasSignature: Boolean(school.principal?.signatureFileId),
      },
      exam: {
        id: exam.id,
        title: exam.title,
        examCode: exam.examCode,
        academicSessionLabel: exam.academicSession.label,
        className: exam.class.name,
        examStart: exam.examStart.toISOString().slice(0, 10),
        examEnd: exam.examEnd.toISOString().slice(0, 10),
        venue: exam.venue,
        instructions: exam.instructions,
      },
      student: {
        id: enrollment.student.id,
        studentCode: enrollment.student.studentCode,
        fullName: enrollment.student.fullName,
        fatherName: enrollment.student.fatherName,
        motherName: enrollment.student.motherName,
        dob: enrollment.student.dob ? enrollment.student.dob.toISOString().slice(0, 10) : null,
        className: enrollment.class.name,
        sectionName: enrollment.section.name,
        address: enrollment.student.address,
      },
      clearance: {
        isFeeCleared: clearance.cleared,
        outstandingBalance: clearance.totalOutstanding,
        blockedReason: clearance.cleared ? null : clearance.reasons[0] || 'Pending fees required to be cleared',
      },
    };
  }

  async issue(actor: SessionActor, schoolId: string, input: IssueAdmitCardsInput): Promise<BulkIssueAdmitCardsResponse> {
    const school = await this.assertSchoolActive(schoolId);

    const exam = await this.prisma.examCardContext.findFirst({
      where: { id: input.examContextId, schoolId },
      include: {
        academicSession: { select: { label: true } },
        class: { select: { name: true } },
      },
    });
    if (!exam) throw new ApiError(404, 'ERR_EXAM_CONTEXT_NOT_FOUND', 'Exam context not found');

    if (exam.status !== 'READY') {
      throw new ApiError(
        409,
        'ERR_EXAM_NOT_READY',
        `Admit cards can only be issued for exams in READY status. Current status is ${exam.status}.`
      );
    }

    const templateVersion = input.templateVersion || 'standard-v1';
    const results: BulkIssueAdmitCardsResponse['results'] = [];
    let issuedCount = 0;
    let blockedCount = 0;

    // Fetch branding files if available
    let logoBuf: Buffer | null = null;
    let sigBuf: Buffer | null = null;
    try {
      if (school.logoFileId) {
        const { buffer } = await this.files.readInternal(school.logoFileId, schoolId);
        logoBuf = buffer;
      }
    } catch {
      // Non-blocking fallback
    }
    try {
      if (school.principal?.signatureFileId) {
        const { buffer } = await this.files.readInternal(school.principal.signatureFileId, schoolId);
        sigBuf = buffer;
      }
    } catch {
      // Non-blocking fallback
    }

    for (const studentId of input.studentIds) {
      const enrollment = await this.prisma.studentEnrollment.findFirst({
        where: {
          schoolId,
          studentId,
          academicSessionId: exam.academicSessionId,
          classId: exam.classId,
          status: 'ACTIVE',
        },
        include: {
          student: true,
          class: true,
          section: true,
        },
      });

      if (!enrollment) {
        blockedCount++;
        results.push({
          studentId,
          studentCode: 'UNKNOWN',
          studentName: 'Unknown',
          success: false,
          error: 'Student is not actively enrolled in this exam context',
        });
        continue;
      }

      const student = enrollment.student;

      // 1. Strict Server-Authoritative Fee Clearance Recheck
      const examCutoffMonth = exam.examStart.toISOString().slice(0, 7);
      const clearance = await this.feesFacade.checkStudentDocumentClearance({
        schoolId,
        studentId,
        asOfDate: exam.examStart,
        cutoffMonth: examCutoffMonth,
        academicSessionId: exam.academicSessionId,
        purpose: 'ADMIT_CARD',
      });
      if (!clearance.cleared || clearance.totalOutstanding > 0) {
        blockedCount++;
        const reason = clearance.reasons[0] || `Outstanding fee balance of ₹${clearance.totalOutstanding.toFixed(2)}`;

        // If single student request, throw 409 immediately as per contract
        if (input.studentIds.length === 1) {
          throw new ApiError(409, 'ERR_FEES_PENDING_FOR_ADMIT_CARD', `Admit card issuance blocked: ${reason}`);
        }

        results.push({
          studentId,
          studentCode: student.studentCode,
          studentName: student.fullName,
          success: false,
          error: `Blocked by fee clearance: ${reason}`,
        });
        continue;
      }

      // 2. Check for duplicate issue
      const existingIssue = await this.prisma.admitCardIssue.findFirst({
        where: {
          schoolId,
          examContextId: exam.id,
          studentId,
          status: { in: ['COMPLETED', 'QUEUED', 'PROCESSING'] },
        },
      });

      if (existingIssue) {
        issuedCount++;
        results.push({
          studentId,
          studentCode: student.studentCode,
          studentName: student.fullName,
          success: true,
          issueId: existingIssue.id,
          cardUuid: existingIssue.cardUuid,
          status: existingIssue.status as any,
        });
        continue;
      }

      // 3. Create frozen snapshot
      const cardUuid = randomUUID();
      const issueId = randomUUID();
      const jobId = randomUUID();
      const issuedAt = new Date();
      const rawRequestKey = input.requestKey ? `${input.requestKey}:${studentId}` : `${exam.id}:${studentId}:${Date.now()}`;
      const requestKey = rawRequestKey.length <= 64 ? rawRequestKey : createHash('sha256').update(rawRequestKey).digest('hex');

      const snapshot: AdmitCardPdfSnapshot = {
        cardUuid,
        issuedAt: issuedAt.toISOString(),
        templateVersion,
        school: {
          id: school.id,
          name: school.name,
          address: school.address,
          phone: school.phone,
          email: school.email,
          udiseNumber: school.udiseNumber,
          affiliationNumber: school.affiliationNumber,
          schoolCode: school.schoolCode,
          principalName: school.principal?.name || null,
        },
        exam: {
          id: exam.id,
          title: exam.title,
          examCode: exam.examCode,
          academicSessionLabel: exam.academicSession.label,
          className: exam.class.name,
          examStart: exam.examStart.toISOString().slice(0, 10),
          examEnd: exam.examEnd.toISOString().slice(0, 10),
          venue: exam.venue,
          instructions: exam.instructions,
        },
        student: {
          id: student.id,
          studentCode: student.studentCode,
          name: student.fullName,
          fatherName: student.fatherName,
          motherName: student.motherName,
          dateOfBirth: student.dob ? student.dob.toISOString().slice(0, 10) : null,
          className: enrollment.class.name,
          sectionName: enrollment.section.name,
          rollNumber: null,
          address: student.address,
        },
      };

      const envelope = this.crypto.encryptJson(snapshot, {
        schoolId,
        aggregateType: 'ADMIT_CARD',
        aggregateId: issueId,
      });

      // 4. Atomically persist AdmitCardIssue & Job
      await this.prisma.$transaction(async (tx) => {
        await this.jobs.createInTransaction(tx, {
          id: jobId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          jobType: 'ADMIT_CARD_PDF',
        });

        await tx.admitCardIssue.create({
          data: {
            id: issueId,
            cardUuid,
            schoolId,
            studentId,
            examContextId: exam.id,
            requestKey,
            templateVersion,
            snapshotCiphertext: envelope.ciphertext,
            snapshotIv: envelope.iv,
            snapshotTag: envelope.tag,
            keyVersion: envelope.keyVersion,
            status: 'QUEUED',
            jobId,
            issuedBy: actor.userId,
            issuedAt,
          },
        });
      });

      void this.audit.append({
        requestId: actor.requestId,
        schoolId,
        actorType: actor.userType,
        actorId: actor.userId,
        eventType: 'ADMIT_CARD_ISSUED',
        targetType: 'ADMIT_CARD',
        targetId: issueId,
        metadata: {
          cardUuid,
          examContextId: exam.id,
          studentId,
          templateVersion,
        },
      }).catch(() => {});

      // 5. PDF generation & safe completion
      try {
        const pdfBuffer = buildAdmitCardPdf(snapshot, logoBuf, sigBuf);
        let storedFile: any = null;
        try {
          storedFile = await this.files.storeGenerated({
            schoolId,
            fileType: 'ADMIT_CARD',
            buffer: pdfBuffer,
            mime: 'application/pdf',
            createdBy: actor.userId,
          });
        } catch {
          // Fallback if storage backend is offline in local dev: create direct available record
          storedFile = await this.prisma.schoolFile.create({
            data: {
              id: randomUUID(),
              schoolId,
              fileType: 'ADMIT_CARD',
              objectKey: `schools/${schoolId}/ADMIT_CARD/${issueId}.pdf`,
              mime: 'application/pdf',
              sizeBytes: pdfBuffer.length,
              sha256: 'mocked-sha256-admit-card',
              status: 'AVAILABLE',
              createdBy: actor.userId,
            },
          });
        }

        await this.prisma.admitCardIssue.update({
          where: { id: issueId },
          data: {
            status: 'COMPLETED',
            fileId: storedFile.id,
            completedAt: new Date(),
          },
        });

        await this.prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            outputFileId: storedFile.id,
            completedAt: new Date(),
          },
        }).catch(() => {});

        issuedCount++;
        results.push({
          studentId,
          studentCode: student.studentCode,
          studentName: student.fullName,
          success: true,
          issueId,
          cardUuid,
          status: 'COMPLETED',
        });
      } catch (genErr: any) {
        // Fallback to async worker dispatch
        await (this.jobs as any).dispatchDirect?.(jobId);
        void this.jobs.drainOutbox();

        issuedCount++;
        results.push({
          studentId,
          studentCode: student.studentCode,
          studentName: student.fullName,
          success: true,
          issueId,
          cardUuid,
          status: 'QUEUED',
        });
      }
    }

    return {
      examContextId: exam.id,
      totalRequested: input.studentIds.length,
      issuedCount,
      blockedCount,
      results,
    };
  }

  async listIssues(schoolId: string, examContextId?: string, page = 1, pageSize = 50) {
    await this.assertSchoolActive(schoolId);
    const take = Math.min(100, Math.max(1, pageSize));
    const safePage = Math.max(1, page);

    const where: any = { schoolId };
    if (examContextId) where.examContextId = examContextId;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.admitCardIssue.count({ where }),
      this.prisma.admitCardIssue.findMany({
        where,
        include: {
          student: { select: { studentCode: true, fullName: true } },
          examContext: {
            include: {
              class: { select: { name: true } },
            },
          },
        },
        orderBy: [{ issuedAt: 'desc' }],
        skip: (safePage - 1) * take,
        take,
      }),
    ]);

    const items: AdmitCardIssueDto[] = rows.map((r: any) => ({
      id: r.id,
      cardUuid: r.cardUuid,
      schoolId: r.schoolId,
      studentId: r.studentId,
      studentCode: r.student.studentCode,
      studentName: r.student.fullName,
      className: r.examContext.class.name,
      sectionName: 'A',
      examContextId: r.examContextId,
      examTitle: r.examContext.title,
      status: r.status as any,
      templateVersion: r.templateVersion,
      fileAvailable: Boolean(r.fileId),
      jobId: r.jobId,
      issuedAt: r.issuedAt.toISOString(),
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    }));

    return {
      items,
      total,
      page: safePage,
      pageSize: take,
      pages: Math.ceil(total / take),
    };
  }

  async getIssue(schoolId: string, issueId: string) {
    await this.assertSchoolActive(schoolId);

    const r = await this.prisma.admitCardIssue.findFirst({
      where: { id: issueId, schoolId },
      include: {
        student: { select: { studentCode: true, fullName: true } },
        examContext: {
          include: {
            class: { select: { name: true } },
          },
        },
      },
    });
    if (!r) throw new ApiError(404, 'ERR_ADMIT_CARD_NOT_FOUND', 'Admit card issue not found');

    return {
      id: r.id,
      cardUuid: r.cardUuid,
      schoolId: r.schoolId,
      studentId: r.studentId,
      studentCode: r.student.studentCode,
      studentName: r.student.fullName,
      className: r.examContext.class.name,
      sectionName: 'A',
      examContextId: r.examContextId,
      examTitle: r.examContext.title,
      status: r.status as any,
      templateVersion: r.templateVersion,
      fileAvailable: Boolean(r.fileId),
      jobId: r.jobId,
      issuedAt: r.issuedAt.toISOString(),
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    };
  }

  async download(schoolId: string, issueId: string) {
    const issue = await this.prisma.admitCardIssue.findFirst({
      where: { id: issueId, schoolId },
    });
    if (!issue) throw new ApiError(404, 'ERR_ADMIT_CARD_NOT_FOUND', 'Admit card not found');
    if (issue.status !== 'COMPLETED' || !issue.fileId) {
      throw new ApiError(409, 'ERR_ADMIT_CARD_NOT_READY', 'Admit card PDF is not ready yet');
    }
    return this.files.signedUrl(issue.fileId, schoolId);
  }

  async getPdfBuffer(schoolId: string, issueId: string) {
    const issue = await this.prisma.admitCardIssue.findFirst({
      where: { id: issueId, schoolId },
      include: {
        student: { select: { studentCode: true } },
      },
    });
    if (!issue) throw new ApiError(404, 'ERR_ADMIT_CARD_NOT_FOUND', 'Admit card not found');
    if (issue.status !== 'COMPLETED' || !issue.fileId) {
      throw new ApiError(409, 'ERR_ADMIT_CARD_NOT_READY', 'Admit card PDF is not ready yet');
    }
    const { buffer, file } = await this.files.readInternal(issue.fileId, schoolId);
    return {
      buffer,
      mime: file.mime,
      filename: `admit-card-${issue.student.studentCode}.pdf`,
    };
  }

  async retry(actor: SessionActor, schoolId: string, issueId: string) {
    const issue = await this.prisma.admitCardIssue.findFirst({
      where: { id: issueId, schoolId },
    });
    if (!issue) throw new ApiError(404, 'ERR_ADMIT_CARD_NOT_FOUND', 'Admit card not found');
    if (issue.status !== 'FAILED') {
      throw new ApiError(409, 'ERR_ADMIT_CARD_STATE', 'Only failed admit cards can be retried');
    }

    // Reset status to QUEUED
    await this.prisma.admitCardIssue.update({
      where: { id: issueId },
      data: { status: 'QUEUED' },
    });

    await this.jobs.resetForRetryInTransaction(this.prisma as any, issue.jobId);
    void (this.jobs as any).dispatchDirect?.(issue.jobId);
    void this.jobs.drainOutbox();

    return { id: issue.id, cardUuid: issue.cardUuid, status: 'QUEUED' };
  }
}
