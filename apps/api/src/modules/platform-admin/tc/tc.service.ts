import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { SensitiveFieldCryptoService } from '../../../platform/crypto/sensitive-field-crypto.service';
import { PrivateFileService } from '../../../platform/files/private-file.service';
import { JobService } from '../../../platform/jobs/job.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { ApiError } from '../../../common/http/api-error';
import type { SessionActor, StudentsPublicFacade, TcStudentSnapshot } from '@custom-school/contracts';
import { STUDENTS_PUBLIC_FACADE } from '../students-port/students.port';

interface TcFrozenSnapshot {
  tcUuid: string;
  issuedAt: string;
  templateVersion: string;
  school: {
    id: string; name: string; address: string | null; phone: string | null; email: string | null;
    logo: { fileId: string; sha256: string; mime: string };
    principal: { name: string; phone: string | null; email: string | null; signature: { fileId: string; sha256: string; mime: string } };
  };
  student: TcStudentSnapshot;
}

@Injectable()
export class TcService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SensitiveFieldCryptoService,
    private readonly files: PrivateFileService,
    private readonly jobs: JobService,
    private readonly audit: AuditService,
    @Inject(STUDENTS_PUBLIC_FACADE) private readonly students: StudentsPublicFacade,
  ) {}

  async searchStudents(schoolId: string, query: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, status: true } });
    if (!school) throw new ApiError(404, 'ERR_SCHOOL_NOT_FOUND', 'School not found');
    if (school.status !== 'ACTIVE') throw new ApiError(409, 'ERR_SCHOOL_NOT_ACTIVE', 'School must be active');
    const q = query.trim();
    if (!q) return [];
    return this.students.searchForPlatformTc({ schoolId, query: q, limit: 20 });
  }

  async issue(actor: SessionActor, schoolId: string, studentId: string, templateVersion: string) {
    if (templateVersion !== 'standard-v1') throw new ApiError(422, 'ERR_TC_TEMPLATE', 'Unsupported TC template');
    const tcId = randomUUID();
    const tcUuid = randomUUID();
    const jobId = randomUUID();
    const issuedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).$queryRaw`SELECT id FROM schools WHERE id=${schoolId}::uuid FOR UPDATE`;
      const school = await tx.school.findUnique({ where: { id: schoolId }, include: { principal: true } });
      if (!school) throw new ApiError(404, 'ERR_SCHOOL_NOT_FOUND', 'School not found');
      if (school.status !== 'ACTIVE') throw new ApiError(409, 'ERR_SCHOOL_NOT_ACTIVE', 'School must be active');
      if (!school.logoFileId || !school.principal?.signatureFileId || !school.principal?.name) {
        throw new ApiError(409, 'ERR_TC_READINESS', 'School logo, principal and principal signature are required for the active TC template');
      }
      const [logo, signature] = await Promise.all([
        this.files.metadata(school.logoFileId, schoolId, 'LOGO', tx),
        this.files.metadata(school.principal.signatureFileId, schoolId, 'SIGNATURE', tx),
      ]);
      if (!logo || !signature) throw new ApiError(409, 'ERR_TC_READINESS', 'TC branding assets are unavailable');

      const student = await this.students.getTcSnapshot({ schoolId, studentId });
      if (!student) throw new ApiError(404, 'ERR_STUDENT_NOT_FOUND', 'Student not found');

      const snapshot: TcFrozenSnapshot = {
        tcUuid,
        issuedAt: issuedAt.toISOString(),
        templateVersion,
        school: {
          id: school.id,
          name: school.name,
          address: school.address,
          phone: school.phone,
          email: school.email,
          logo: { fileId: logo.id, sha256: logo.sha256, mime: logo.mime },
          principal: {
            name: school.principal.name,
            phone: school.principal.phone,
            email: school.principal.email,
            signature: { fileId: signature.id, sha256: signature.sha256, mime: signature.mime },
          },
        },
        student,
      };
      const envelope = this.crypto.encryptJson(snapshot, { schoolId, aggregateType: 'TC', aggregateId: tcId });
      await this.jobs.createInTransaction(tx,{id:jobId,schoolId,actorType:'PLATFORM_ADMIN',actorId:actor.userId,jobType:'TC_PDF'});
      await tx.transferCertificate.create({ data: {
        id: tcId, tcUuid, schoolId, studentId, templateVersion,
        snapshotCiphertext: envelope.ciphertext, snapshotIv: envelope.iv, snapshotTag: envelope.tag, keyVersion: envelope.keyVersion,
        status: 'QUEUED', jobId, issuedBy: actor.userId, issuedAt,
      } });
      await this.audit.append({ requestId: actor.requestId, schoolId, actorType: 'PLATFORM_ADMIN', actorId: actor.userId, eventType: 'TC_ISSUED', targetType: 'TRANSFER_CERTIFICATE', targetId: tcId, metadata: { tcUuid, studentId, templateVersion } }, tx as any);
    });
    void this.jobs.drainOutbox();
    return { id: tcId, tcUuid, jobId, status: 'QUEUED', issuedAt };
  }

  private decryptIdentity(row: any) {
    const snapshot = this.crypto.decryptJson<TcFrozenSnapshot>({ ciphertext: row.snapshotCiphertext, iv: row.snapshotIv, tag: row.snapshotTag, keyVersion: row.keyVersion }, { schoolId: row.schoolId, aggregateType: 'TC', aggregateId: row.id });
    return { studentId: snapshot.student.id, studentCode: snapshot.student.studentCode, studentName: snapshot.student.name, className: snapshot.student.className, sectionName: snapshot.student.sectionName };
  }

  async list(schoolId: string, page = 1, pageSize = 20) {
    const take = Math.min(100, Math.max(1, pageSize)); const safePage = Math.max(1, page);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.transferCertificate.count({ where: { schoolId } }),
      this.prisma.transferCertificate.findMany({ where: { schoolId }, orderBy: { issuedAt: 'desc' }, skip: (safePage - 1) * take, take }),
    ]);
    return { items: rows.map(r => ({ id: r.id, tcUuid: r.tcUuid, status: r.status, templateVersion: r.templateVersion, issuedAt: r.issuedAt, completedAt: r.completedAt, ...this.decryptIdentity(r) })), total, page: safePage, pageSize: take, pages: Math.ceil(total / take) };
  }

  async get(schoolId: string, tcId: string) {
    const row = await this.prisma.transferCertificate.findFirst({ where: { id: tcId, schoolId } });
    if (!row) throw new ApiError(404, 'ERR_TC_NOT_FOUND', 'Transfer certificate not found');
    return { id: row.id, tcUuid: row.tcUuid, status: row.status, templateVersion: row.templateVersion, issuedAt: row.issuedAt, completedAt: row.completedAt, fileAvailable: Boolean(row.fileId), ...this.decryptIdentity(row) };
  }

  async retry(actor: SessionActor, schoolId: string, tcId: string) {
    const row = await this.prisma.$transaction(async (tx) => {
      await (tx as any).$queryRaw`SELECT id FROM transfer_certificates WHERE id=${tcId}::uuid AND school_id=${schoolId}::uuid FOR UPDATE`;
      const tc = await tx.transferCertificate.findFirst({ where: { id: tcId, schoolId } });
      if (!tc) throw new ApiError(404, 'ERR_TC_NOT_FOUND', 'Transfer certificate not found');
      if (tc.status !== 'FAILED') throw new ApiError(409, 'ERR_TC_STATE', 'Only failed rendering can be retried');
      await tx.transferCertificate.update({ where: { id: tc.id }, data: { status: 'QUEUED' } });
      await this.jobs.resetForRetryInTransaction(tx,tc.jobId);
      await this.audit.append({ requestId: actor.requestId, schoolId, actorType: 'PLATFORM_ADMIN', actorId: actor.userId, eventType: 'TC_RENDER_RETRY_REQUESTED', targetType: 'TRANSFER_CERTIFICATE', targetId: tc.id, metadata: { tcUuid: tc.tcUuid } }, tx as any);
      return tc;
    });
    void this.jobs.drainOutbox();
    return { id: row.id, tcUuid: row.tcUuid, status: 'QUEUED' };
  }

  async download(schoolId: string, tcId: string) {
    const row = await this.prisma.transferCertificate.findFirst({ where: { id: tcId, schoolId } });
    if (!row) throw new ApiError(404, 'ERR_TC_NOT_FOUND', 'Transfer certificate not found');
    if (row.status !== 'COMPLETED' || !row.fileId) throw new ApiError(409, 'ERR_TC_NOT_READY', 'Transfer certificate is not ready');
    return this.files.signedUrl(row.fileId, schoolId);
  }
}
