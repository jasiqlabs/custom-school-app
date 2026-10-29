# Render / Neon deployment recovery — 29 Oct 2026

**Scope:** `jasiqlabs/custom-school-app`, Render API, Neon `school_app`, Prisma 5.22.0.
**Source fix:** `fix/render-prisma-migration-uuid-20261029` (7 `school_id` SQL definitions changed from VARCHAR to UUID in migrations 0008/0011/0012/0014). `prisma/schema.prisma` already declared these fields as UUID.

**IMPORTANT:** Source fixes do **not** clear an already failed migration in Neon. This runbook is for the local developer / database operator; the repository changes themselves do not access production.

## 1. Protect production before any recovery

1. Temporarily pause Render auto-deploys and avoid concurrent migration jobs.
2. Create a verified, restorable Neon backup/snapshot (or branch at a known recovery point), and record existing school/student/fee/payment counts. Test the recovery sequence against a *copy* first. Never expose database credentials in Git or logs.
3. Check the *actual target database* and migration history using a direct Neon PostgreSQL connection (prefer the non-pooler endpoint for migration operations, if available):

```bash
npm run qa:migrations
npx prisma validate --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma
```

```sql
SELECT migration_name, started_at, finished_at, rolled_back_at, logs
FROM public."_prisma_migrations"
WHERE migration_name IN (
  '0008_task_007_academic_sessions',
  '0011_task_012_fee_categories_and_rules',
  '0012_task_013_multi_category_fee_charges',
  '0014_task_034_035_examination_admit_cards'
)
ORDER BY started_at;

SELECT to_regclass('public.academic_sessions') AS academic_sessions_table;
SELECT table_name, column_name, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('schools', 'academic_sessions', 'fee_categories',
                     'fee_rules', 'fee_charges', 'fee_payment_allocations',
                     'exam_card_contexts', 'admit_card_issues')
  AND column_name IN ('id', 'school_id')
ORDER BY table_name, column_name;
```

**STOP and escalate** if 0008 is already successfully applied, any later edited migration has been successfully applied, history is different from the Render log, or unexpected data/dependencies are present. Editing a previously successful migration can create checksum/history problems in that environment. Do not overwrite history or force a reset.

## 2. Recover the specific partial 0008 failure

Do this **only** when history confirms that `0008_task_007_academic_sessions` failed and is not already resolved, and after backup and staging rehearsal. The observed 0008 script creates only an enum, table and table indexes before its failing FK. PostgreSQL/Prisma 5 may leave those objects behind after a failed migration.

Inspect the table first (only if it exists):

```sql
SELECT count(*) FROM public.academic_sessions;
```

If it has any records, **STOP**; do not drop it. The following transaction also checks that history is failed, takes an exclusive table lock, refuses nonempty tables, and uses RESTRICT rather than CASCADE. It does **not** delete any school/student/fee/payment tables.

```sql
BEGIN;
DO $$
DECLARE existing_rows bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."_prisma_migrations"
    WHERE migration_name = '0008_task_007_academic_sessions'
      AND finished_at IS NULL AND rolled_back_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Expected unresolved failed 0008 migration not found; refusing cleanup';
  END IF;

  IF to_regclass('public.academic_sessions') IS NOT NULL THEN
    LOCK TABLE public.academic_sessions IN ACCESS EXCLUSIVE MODE;
    SELECT count(*) INTO existing_rows FROM public.academic_sessions;
    IF existing_rows <> 0 THEN
      RAISE EXCEPTION 'academic_sessions has % records; refusing cleanup', existing_rows;
    END IF;
  END IF;
END $$;

DROP TABLE IF EXISTS public.academic_sessions RESTRICT;
DROP TYPE IF EXISTS public."AcademicSessionStatus" RESTRICT;
COMMIT;
```

If this transaction fails, **STOP** and inspect. Do not retry with `CASCADE`.

After the cleanup transaction **commits successfully**, mark only the failed attempt rolled back:

```bash
npx prisma migrate resolve --rolled-back 0008_task_007_academic_sessions --schema prisma/schema.prisma
```

`migrate resolve` changes the migration *ledger only*; it never undoes SQL or data changes. Do not mark 0008 `--applied` if the corrected table/FK was not actually created.

## 3. Verification and rollout

1. First repeat step 2 against a Neon copy of the failed database. Use the corrected branch and run `npx prisma migrate deploy --schema prisma/schema.prisma`. Confirm all pending migrations succeed, all seven `school_id` columns have `udt_name = 'uuid'`, and previously existing data and login flows remain intact.
2. Execute project build/tests and API smoke tests against the clone. Check school isolation, academic sessions, enrollments, fee rules/charges/payments, exams/admit cards; verify previous records/counts and administrator credentials/status/version have not changed.
3. Only after staging succeeds, perform the same **guarded** recovery in production, merge the approved fix to `main` and manually deploy the corrected commit. Keep automatic deployment paused until deployment succeeds.
4. Run `npx prisma migrate status --schema prisma/schema.prisma` and verify all 14 migrations applied without an unresolved failure, plus normal API health and data checks; then re-enable auto-deploy.

The repaired `seed:admin` is **create-only**: it seeds just the explicitly configured `PLATFORM_ADMIN_EMAIL` with `PLATFORM_ADMIN_PASSWORD` when no such administrator exists, and never updates passwords, status, lockouts or session versions of existing users. It does not create default/predictable admin aliases. Provide a strong password (at least 12 characters) when provisioning a *new* administrator. Review any historical default admin accounts separately; do not delete/deactivate without identifying who uses them.

**Never run:** `prisma migrate reset`, `prisma db push --force-reset`, a database recreation, or `DROP ... CASCADE` against production. The Render build command can remain otherwise unchanged; run migration verification before retrying.

Documentation: https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/patching-and-hotfixing and https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/troubleshooting
