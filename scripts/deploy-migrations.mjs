import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { choose0008Recovery } from './migration-recovery-0008-policy.mjs';

const MIGRATION = '0008_task_007_academic_sessions';
const EXPECTED_COLUMNS = new Map([
  ['id', 'uuid'], ['school_id', 'character varying'],
  ['code', 'character varying'], ['label', 'character varying'],
  ['start_date', 'date'], ['end_date', 'date'],
  ['status', 'USER-DEFINED'], ['version', 'integer'],
  ['created_by', 'uuid'], ['activated_at', 'timestamp with time zone'],
  ['closed_at', 'timestamp with time zone'],
  ['created_at', 'timestamp with time zone'],
  ['updated_at', 'timestamp with time zone'],
]);
const EXPECTED_INDEXES = new Set([
  'academic_sessions_pkey',
  'academic_sessions_school_id_code_key',
  'academic_sessions_school_id_id_key',
  'academic_sessions_school_id_status_idx',
  'academic_session_active_closing_idx',
]);

function prismaCommand(args) {
  const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(runner, ['--no-install', 'prisma', ...args, '--schema', 'prisma/schema.prisma'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  return { ok: result.status === 0, output: (result.stdout || '') + (result.stderr || '') };
}

function fail(message) { throw new Error(`Migration recovery stopped safely: ${message}`); }

async function columns(tx) {
  return tx.$queryRawUnsafe(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'academic_sessions'
    ORDER BY ordinal_position
  `);
}

function assertColumns(rows) {
  if (rows.length !== EXPECTED_COLUMNS.size) fail('academic_sessions has unexpected columns');
  for (const col of rows) {
    const expected = EXPECTED_COLUMNS.get(col.column_name);
    if (!expected) fail(`unexpected academic_sessions column ${col.column_name}`);
    if (col.column_name === 'school_id') {
      if (!['uuid', 'character varying'].includes(col.data_type)) fail('unexpected school_id type');
    } else if (col.data_type !== expected) fail(`unexpected type on ${col.column_name}`);
  }
  return rows.find((col) => col.column_name === 'school_id').data_type;
}

async function assertShape(tx, { requireForeignKey = false } = {}) {
  const currentColumns = await columns(tx);
  const schoolType = assertColumns(currentColumns);
  const indexes = await tx.$queryRawUnsafe(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'academic_sessions'
  `);
  const names = new Set(indexes.map((x) => x.indexname));
  if (names.size !== EXPECTED_INDEXES.size || [...EXPECTED_INDEXES].some((n) => !names.has(n))) {
    fail('table indexes are not exactly those from the original migration');
  }
  const constraints = await tx.$queryRawUnsafe(`
    SELECT conname, contype, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'public.academic_sessions'::regclass
  `);
  const allowed = new Set(['academic_sessions_pkey', 'academic_sessions_dates_check', 'academic_sessions_school_id_fkey']);
  if (constraints.some((c) => !allowed.has(c.conname))) fail('unexpected table constraint');
  const dateCheck = constraints.find((c) => c.conname === 'academic_sessions_dates_check');
  const primaryKey = constraints.find((c) => c.conname === 'academic_sessions_pkey');
  if (!dateCheck || dateCheck.contype !== 'c' || !primaryKey || primaryKey.contype !== 'p') {
    fail('expected initial table constraints are missing');
  }
  const fk = constraints.find((c) => c.conname === 'academic_sessions_school_id_fkey');
  if (fk && (fk.contype !== 'f' || !/FOREIGN KEY \(school_id\) REFERENCES schools\(id\)/.test(fk.definition))) {
    fail('foreign key differs from expected relation');
  }
  if (requireForeignKey && !fk) fail('foreign key still missing');
  if (fk && schoolType !== 'uuid') fail('foreign key exists but column is not UUID');
  const types = await tx.$queryRawUnsafe(`
    SELECT e.enumlabel
    FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'AcademicSessionStatus'
    ORDER BY e.enumsortorder
  `);
  if (types.map((x) => x.enumlabel).join(',') !== 'DRAFT,ACTIVE,CLOSING,CLOSED') {
    fail('academic session enum differs from the original migration');
  }
  return { schoolType, hasForeignKey: Boolean(fk) };
}

async function recoverKnownFailure() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) fail('DIRECT_URL is required to ensure the same migration database is inspected');
  const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });
  try {
    // Don't make a general recovery mechanism. Only the one observed,
    // recorded P3018 error in 0008 is eligible, and only on an empty table.
    const recoveryAction = await prisma.$transaction(async (tx) => {
      const failed = await tx.$queryRawUnsafe(`
        SELECT migration_name, logs, finished_at, rolled_back_at
        FROM public."_prisma_migrations"
        WHERE finished_at IS NULL AND rolled_back_at IS NULL
        FOR UPDATE
      `);
      if (failed.length !== 1 || failed[0].migration_name !== MIGRATION) {
        fail('migration ledger contains a different or multiple unresolved failures');
      }
      const logs = String(failed[0].logs || '');
      if (!logs.includes('42804') || !logs.includes('academic_sessions_school_id_fkey')) {
        fail('failure fingerprint is not the known 0008 VARCHAR-vs-UUID error');
      }
      // Migration 0008 ran on PostgreSQL as a single failed statement
      // transaction in some environments: its enum and table can both be absent.
      // That state must be resolved as ROLLED BACK, never APPLIED.
      const metadata = await tx.$queryRawUnsafe(`
        SELECT
          to_regclass('public.academic_sessions') IS NOT NULL AS table_present,
          to_regtype('public."AcademicSessionStatus"') IS NOT NULL AS enum_present,
          (
            SELECT COUNT(*)::integer
            FROM pg_class
            WHERE relnamespace = 'public'::regnamespace
              AND relname IN (
                'academic_sessions_pkey',
                'academic_sessions_school_id_code_key',
                'academic_sessions_school_id_id_key',
                'academic_sessions_school_id_status_idx',
                'academic_session_active_closing_idx'
              )
          ) AS residual_objects
      `);
      const state = metadata[0];
      if (!state) fail('cannot inspect 0008 migration artifacts');
      const action = choose0008Recovery({
        tablePresent: state.table_present,
        enumPresent: state.enum_present,
        residualObjects: state.residual_objects,
      });
      if (action === 'retry-fully-rolled-back') {
        const schools = await tx.$queryRawUnsafe(`
          SELECT data_type FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'id'
        `);
        if (schools.length !== 1 || schools[0].data_type !== 'uuid') {
          fail('schools.id is not the expected UUID primary key; refusing migration retry');
        }
        console.log('Verified: failed 0008 left no table, enum, or indexes. Safe to mark rolled back and retry.');
        return action;
      }

      await tx.$executeRawUnsafe('LOCK TABLE public.academic_sessions IN ACCESS EXCLUSIVE MODE');
      const rows = await tx.$queryRawUnsafe('SELECT COUNT(*)::integer AS total FROM public.academic_sessions');
      if (rows[0].total !== 0) fail('academic_sessions is not empty: no automatic repair allowed');

      const initial = await assertShape(tx);
      if (initial.schoolType === 'character varying') {
        await tx.$executeRawUnsafe(`
          ALTER TABLE public.academic_sessions
          ALTER COLUMN school_id TYPE uuid USING school_id::uuid
        `);
      }
      if (!initial.hasForeignKey) {
        await tx.$executeRawUnsafe(`
          ALTER TABLE public.academic_sessions
          ADD CONSTRAINT academic_sessions_school_id_fkey
          FOREIGN KEY (school_id) REFERENCES public.schools(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
        `);
      }
      const finalShape = await assertShape(tx, { requireForeignKey: true });
      if (finalShape.schoolType !== 'uuid') fail('UUID repair did not complete');
      return action;
    }, { maxWait: 10000, timeout: 30000 });

    if (recoveryAction === 'repair-empty-table') {
      console.log('Verified: known 0008 partial table was empty; missing UUID FK safely reconciled.');
    }

    const resolveFlag = recoveryAction === 'retry-fully-rolled-back' ? '--rolled-back' : '--applied';
    const resolved = prismaCommand(['migrate', 'resolve', resolveFlag, MIGRATION]);
    if (!resolved.ok) fail('Prisma failed to record 0008 recovery state; review before redeploy');
  } finally {
    await prisma.$disconnect();
  }
}

const attempt = prismaCommand(['migrate', 'deploy']);
if (!attempt.ok) {
  if (!attempt.output.includes('P3009') || !attempt.output.includes(MIGRATION)) {
    console.error('Migration failed; no automatic recovery allowed for this failure.');
    process.exit(1);
  }
  console.log('Attempting guarded, one-time recovery for confirmed 0008 P3009 only.');
  try {
    await recoverKnownFailure();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
  const retried = prismaCommand(['migrate', 'deploy']);
  if (!retried.ok) process.exit(1);
}
console.log('Production migrations applied successfully.');
