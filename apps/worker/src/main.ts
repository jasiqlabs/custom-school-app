import 'dotenv/config';
import { Worker, Job as BullJob } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { Client as MinioClient } from 'minio';
import { createDecipheriv, createHash, randomUUID } from 'crypto';
import { buildTcPdf } from './tc-pdf-builder';

const dbUrl = process.env.DATABASE_URL || '';
const workerDbUrl = dbUrl && !dbUrl.includes('connection_limit')
  ? `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}connection_limit=3&pool_timeout=30`
  : dbUrl;
const prisma = new PrismaClient(workerDbUrl ? { datasources: { db: { url: workerDbUrl } } } : undefined);
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const minio = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});
const bucket = process.env.MINIO_BUCKET || 'gdys-private';
const keys = JSON.parse(process.env.DATA_ENCRYPTION_KEYS_JSON || '{}') as Record<string, string>;
const fileCache = new Map<string, Buffer>();

function decrypt(row: any) {
  const key = Buffer.from(keys[row.keyVersion] || '', 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY_UNAVAILABLE');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(row.snapshotIv, 'base64'));
  d.setAAD(Buffer.from(JSON.stringify({ schoolId: row.schoolId, aggregateType: 'TC', aggregateId: row.id })));
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
    const stream = await minio.getObject(bucket, file.objectKey);
    const chunks: Buffer[] = [];
    for await (const c of stream as any) chunks.push(Buffer.from(c));
    const buffer = Buffer.concat(chunks);
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
  if (!tc) throw new Error('TC_NOT_FOUND');
  console.log(`[Worker] TC fetched in ${Date.now() - startT}ms`);

  try {
    const tRender = Date.now();
    const snap = decrypt(tc);
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
    const objectKey = `schools/${tc.schoolId}/tc/${fileId}`;
    await minio.putObject(bucket, objectKey, pdf, pdf.length, {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, no-store',
    });
    const pdfSha = createHash('sha256').update(pdf).digest('hex');
    console.log(`[Worker] MinIO stored in ${Date.now() - tStore}ms`);

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
    const existingTc = await prisma.transferCertificate.findUnique({ where: { jobId } }).catch(() => null);
    if (existingTc) {
      await prisma.transferCertificate.update({
        where: { id: existingTc.id },
        data: { status: finalAttempt ? 'FAILED' : 'QUEUED' },
      }).catch(() => {});
      if (finalAttempt) {
        await prisma.auditLog.create({
          data: {
            requestId: `job:${jobId}`,
            schoolId: existingTc.schoolId,
            actorType: 'SYSTEM',
            actorId: null,
            eventType: 'TC_RENDER_FAILED',
            targetType: 'TRANSFER_CERTIFICATE',
            targetId: existingTc.id,
            metadata: { tcUuid: existingTc.tcUuid, errorCode: code, issuedById: existingTc.issuedBy },
          },
        }).catch(() => {});
      }
    }
    throw error;
  }
}

async function start() {
  if (!(await minio.bucketExists(bucket).catch(() => false))) await minio.makeBucket(bucket);

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
