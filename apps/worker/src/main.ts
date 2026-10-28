import 'dotenv/config';
import { Worker, Job as BullJob } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { PrivateObjectStorage } from '@custom-school/storage';
import { createDecipheriv, createHash, randomUUID } from 'crypto';
import { buildTcPdf } from './tc-pdf-builder';
import { buildAdmitCardPdf } from './admit-card-pdf-builder';

const dbUrl = process.env.DATABASE_URL || '';
const workerDbUrl = dbUrl
  ? `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}connection_limit=3&pool_timeout=30&connect_timeout=30`
  : dbUrl;
const prisma = new PrismaClient(workerDbUrl ? { datasources: { db: { url: workerDbUrl } } } : undefined);
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const storage = new PrivateObjectStorage(process.env);
const keys = JSON.parse(process.env.DATA_ENCRYPTION_KEYS_JSON || '{}') as Record<string, string>;
const fileCache = new Map<string, Buffer>();

function decrypt(row: any, aggregateType = 'TC') {
  const key = Buffer.from(keys[row.keyVersion] || '', 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY_UNAVAILABLE');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(row.snapshotIv, 'base64'));
  d.setAAD(Buffer.from(JSON.stringify({ schoolId: row.schoolId, aggregateType, aggregateId: row.id })));
  d.setAuthTag(Buffer.from(row.snapshotTag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(row.snapshotCiphertext, 'base64')), d.final()]).toString('utf8'));
}

async function readBrandingFiles(
  schoolId: string,
  logoFileId: string,
  logoSha: string,
  sigFileId: string,
  sigSha: string
): Promise<[Buffer, Buffer]> {
  const logoKey = `${schoolId}:${logoFileId}:${logoSha}`;
  const sigKey = `${schoolId}:${sigFileId}:${sigSha}`;

  const cachedLogo = fileCache.get(logoKey);
  const cachedSig = fileCache.get(sigKey);

  if (cachedLogo && cachedSig) {
    return [cachedLogo, cachedSig];
  }

  const neededIds: string[] = [];
  if (!cachedLogo) neededIds.push(logoFileId);
  if (!cachedSig) neededIds.push(sigFileId);

  const files = await prisma.schoolFile.findMany({
    where: { id: { in: neededIds }, schoolId, status: 'AVAILABLE' },
  });
  const fileMap = new Map(files.map((f) => [f.id, f]));

  async function fetchBuffer(fileId: string, expectedSha: string) {
    const file = fileMap.get(fileId);
    if (!file) throw new Error('BRANDING_FILE_NOT_FOUND');
    const buffer = await storage.read(file.objectKey);
    if (createHash('sha256').update(buffer).digest('hex') !== expectedSha)
      throw new Error('BRANDING_FILE_HASH_MISMATCH');
    return buffer;
  }

  const [logoBuf, sigBuf] = await Promise.all([
    cachedLogo ? Promise.resolve(cachedLogo) : fetchBuffer(logoFileId, logoSha),
    cachedSig ? Promise.resolve(cachedSig) : fetchBuffer(sigFileId, sigSha),
  ]);

  fileCache.set(logoKey, logoBuf);
  fileCache.set(sigKey, sigBuf);
  return [logoBuf, sigBuf];
}

async function processJob(bull: BullJob) {
  const payload = bull.data;
  if (!payload || typeof payload.jobId !== 'string' || Object.keys(payload).length!==1) {
    throw new Error('INVALID_QUEUE_PAYLOAD');
  }
  const jobId = payload.jobId;
  const startT = Date.now();
  console.log(`[Worker] Started job ${jobId}`);

  const now = new Date();
  const lease = new Date(Date.now() + 5 * 60_000);
  const claimed = await prisma.job.updateMany({
    where: {
      id: jobId,
      OR: [{ status: 'QUEUED' }, { status: 'PROCESSING', OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }],
    },
    data: { status: 'PROCESSING', startedAt: now, leaseUntil: lease, attemptCount: { increment: 1 }, errorCode: null },
  });

  if (!claimed.count) {
    const existing = await prisma.job.findUnique({ where: { id: jobId } });
    if (
      existing?.status === 'COMPLETED' ||
      (existing?.status === 'PROCESSING' && existing.leaseUntil && existing.leaseUntil.getTime() > Date.now())
    )
      return;
    throw new Error('JOB_NOT_CLAIMABLE');
  }

  const tc = await prisma.transferCertificate.findUnique({ where: { jobId } });
  if (tc) {
    console.log(`[Worker] TC fetched in ${Date.now() - startT}ms`);

    try {
      const tRender = Date.now();
      const snap = decrypt(tc, 'TC');
      const [logo, sig] = await readBrandingFiles(
        tc.schoolId,
        snap.school.logo.fileId,
        snap.school.logo.sha256,
        snap.school.principal.signature.fileId,
        snap.school.principal.signature.sha256
      );
      const pdf = buildTcPdf(snap, logo, sig);
      console.log(`[Worker] PDF rendered in ${Date.now() - tRender}ms`);

      const tStore = Date.now();
      const fileId = randomUUID();
      const objectKey = storage.objectKey(tc.schoolId, 'TC', fileId);
      await storage.put(objectKey, pdf, 'application/pdf');
      const pdfSha = createHash('sha256').update(pdf).digest('hex');
      console.log(`[Worker] ${storage.provider} stored in ${Date.now() - tStore}ms`);

      const tTx = Date.now();
      await prisma.$executeRaw`
        WITH ins_file AS (
          INSERT INTO school_files (id, school_id, file_type, object_key, mime, size_bytes, sha256, status, created_by, created_at)
          VALUES (${fileId}::uuid, ${tc.schoolId}, 'TC'::"FileType", ${objectKey}, 'application/pdf', ${pdf.length}, ${pdfSha}, 'AVAILABLE'::"FileStatus", ${tc.issuedBy}::uuid, NOW())
        ),
        upd_tc AS (
          UPDATE transfer_certificates
          SET status = 'COMPLETED'::"TcStatus", file_id = ${fileId}::uuid, completed_at = NOW()
          WHERE id = ${tc.id}::uuid
        ),
        upd_job AS (
          UPDATE jobs
          SET status = 'COMPLETED'::"JobStatus", output_file_id = ${fileId}::uuid, completed_at = NOW(), lease_until = NULL
          WHERE id = ${jobId}::uuid
        )
        INSERT INTO audit_logs (id, request_id, school_id, actor_type, actor_id, event_type, target_type, target_id, metadata_json, occurred_at)
        VALUES (gen_random_uuid(), ${'job:' + jobId}, ${tc.schoolId}, 'SYSTEM', NULL, 'TC_RENDER_COMPLETED', 'TRANSFER_CERTIFICATE', ${tc.id}, ${JSON.stringify({ tcUuid: tc.tcUuid, fileId, issuedById: tc.issuedBy })}::jsonb, NOW())
      `;
      console.log(`[Worker] DB completion CTE in ${Date.now() - tTx}ms. Total worker time: ${Date.now() - startT}ms`);
      return;
    } catch (error: any) {
      console.error(`[Worker ERROR] ${error?.message || error}`);
      const finalAttempt = bull.attemptsMade + 1 >= (bull.opts.attempts || 1);
      const code = String(error?.message || 'JOB_FAILED')
        .slice(0, 96)
        .replace(/[^A-Z0-9_:-]/gi, '_');
      await prisma.job.update({
        where: { id: jobId },
        data: { status: finalAttempt ? 'FAILED' : 'QUEUED', errorCode: code, leaseUntil: null },
      }).catch(() => {});
      await prisma.transferCertificate.update({
        where: { id: tc.id },
        data: { status: finalAttempt ? 'FAILED' : 'QUEUED' },
      }).catch(() => {});
      if (finalAttempt) {
        await prisma.auditLog.create({
          data: {
            requestId: `job:${jobId}`,
            schoolId: tc.schoolId,
            actorType: 'SYSTEM',
            actorId: null,
            eventType: 'TC_RENDER_FAILED',
            targetType: 'TRANSFER_CERTIFICATE',
            targetId: tc.id,
            metadata: { tcUuid: tc.tcUuid, errorCode: code, issuedById: tc.issuedBy },
          },
        }).catch(() => {});
      }
      throw error;
    }
  }

  const card = await prisma.admitCardIssue.findUnique({ where: { jobId } });
  if (card) {
    console.log(`[Worker] AdmitCard fetched in ${Date.now() - startT}ms`);

    try {
      const tRender = Date.now();
      const snap = decrypt(card, 'ADMIT_CARD');
      let logo: Buffer | null = null;
      let sig: Buffer | null = null;
      try {
        const school = await prisma.school.findUnique({
          where: { id: card.schoolId },
          include: { principal: true },
        });
        if (school?.logoFileId && school?.principal?.signatureFileId) {
          const files = await prisma.schoolFile.findMany({
            where: { id: { in: [school.logoFileId, school.principal.signatureFileId] }, schoolId: card.schoolId, status: 'AVAILABLE' },
          });
          const lFile = files.find(f => f.id === school.logoFileId);
          const sFile = files.find(f => f.id === school.principal!.signatureFileId);
          if (lFile) logo = await storage.read(lFile.objectKey);
          if (sFile) sig = await storage.read(sFile.objectKey);
        }
      } catch {
        // Non-blocking fallback for branding images
      }

      const pdf = buildAdmitCardPdf(snap, logo, sig);
      console.log(`[Worker] AdmitCard PDF rendered in ${Date.now() - tRender}ms`);

      const tStore = Date.now();
      const fileId = randomUUID();
      const objectKey = storage.objectKey(card.schoolId, 'ADMIT_CARD' as any, fileId);
      await storage.put(objectKey, pdf, 'application/pdf');
      const pdfSha = createHash('sha256').update(pdf).digest('hex');
      console.log(`[Worker] ${storage.provider} stored in ${Date.now() - tStore}ms`);

      const tTx = Date.now();
      await prisma.$executeRaw`
        WITH ins_file AS (
          INSERT INTO school_files (id, school_id, file_type, object_key, mime, size_bytes, sha256, status, created_by, created_at)
          VALUES (${fileId}::uuid, ${card.schoolId}, 'ADMIT_CARD'::"FileType", ${objectKey}, 'application/pdf', ${pdf.length}, ${pdfSha}, 'AVAILABLE'::"FileStatus", ${card.issuedBy}::uuid, NOW())
        ),
        upd_card AS (
          UPDATE admit_card_issues
          SET status = 'COMPLETED'::"AdmitCardStatus", file_id = ${fileId}::uuid, completed_at = NOW()
          WHERE id = ${card.id}::uuid
        ),
        upd_job AS (
          UPDATE jobs
          SET status = 'COMPLETED'::"JobStatus", output_file_id = ${fileId}::uuid, completed_at = NOW(), lease_until = NULL
          WHERE id = ${jobId}::uuid
        )
        INSERT INTO audit_logs (id, request_id, school_id, actor_type, actor_id, event_type, target_type, target_id, metadata_json, occurred_at)
        VALUES (gen_random_uuid(), ${'job:' + jobId}, ${card.schoolId}, 'SYSTEM', NULL, 'ADMIT_CARD_RENDER_COMPLETED', 'ADMIT_CARD', ${card.id}, ${JSON.stringify({ cardUuid: card.cardUuid, fileId, issuedById: card.issuedBy })}::jsonb, NOW())
      `;
      console.log(`[Worker] DB completion CTE in ${Date.now() - tTx}ms. Total worker time: ${Date.now() - startT}ms`);
      return;
    } catch (error: any) {
      console.error(`[Worker ERROR] ${error?.message || error}`);
      const finalAttempt = bull.attemptsMade + 1 >= (bull.opts.attempts || 1);
      const code = String(error?.message || 'JOB_FAILED')
        .slice(0, 96)
        .replace(/[^A-Z0-9_:-]/gi, '_');
      await prisma.job.update({
        where: { id: jobId },
        data: { status: finalAttempt ? 'FAILED' : 'QUEUED', errorCode: code, leaseUntil: null },
      }).catch(() => {});
      await prisma.admitCardIssue.update({
        where: { id: card.id },
        data: { status: finalAttempt ? 'FAILED' : 'QUEUED' },
      }).catch(() => {});
      throw error;
    }
  }

  throw new Error('DOCUMENT_NOT_FOUND');
}

async function start() {
  await storage.initialize();

  // Warm up Prisma database connection on boot
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  } catch (e: any) {
    console.warn('[Worker] Prisma warm-up:', e.message);
  }

  // Keep TCP/TLS connection active to eliminate reconnect penalties
  setInterval(() => {
    prisma.$queryRaw`SELECT 1`.catch(() => {});
  }, 15000);

  const worker = new Worker('gdys-jobs', processJob, { connection: connection as any, concurrency: 4 });
  worker.on('failed', (job, err) =>
    console.error(JSON.stringify({ level: 'error', jobId: job?.id, error: err.message }))
  );
  const shutdown = async () => {
    await worker.close();
    connection.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  console.log('GDYS worker started');
}

void start();
