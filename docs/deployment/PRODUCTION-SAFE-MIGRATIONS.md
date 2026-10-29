# Safe Database Migrations — Render + Neon

Scope: Custom School App API, Prisma 5.22, PostgreSQL on Neon. This is the production deployment policy and a one-time, **fail-closed** recovery for the known 29-Oct-2026 academic-sessions failure.

## Desired deployment sequence

1. **Build (no DB schema changes):** install locked dependencies, run migration policy tests, generate Prisma client, compile packages/API. A failed build never starts a migration.
2. **Pre-deploy (database operations):** apply pending Prisma migrations **exactly once per release**, then run the idempotent/create-only admin seed. On failure, do not deploy the new API.
3. **Start and health-check:** switch traffic to the new version only when healthy, keeping the old app available during rollout.
4. **After deployment:** verify school segregation, enrollment, fee balance and payment data. Store an offsite/Neon restore point before schema-changing releases.

Render's pre-deploy command is available for paid web services, private services and background workers. If it is unavailable on your current Render plan, use the fallback below, but plan migration separation before production launch.

### Render settings (one-time configuration)

- **Build:** `npm ci --include=dev && npm run qa:release-migrations && npm run deploy:compile`
- **Pre-deploy:** `npm run deploy:predeploy`
- **Start:** retain the existing working start command.
- **Health:** retain existing working health path; verify it reports **readiness**, not just process liveness.

Remove the old `prisma migrate deploy` and `seed:admin` from the build command. Both are now in pre-deploy. This configuration must be applied to the actual Render service (committing these package scripts alone will NOT change service settings). No new secrets are introduced; `DIRECT_URL` should be a Neon **direct, non-pooler** connection string to the same database as `DATABASE_URL`.

**Fallback if pre-deploy isn't supported:** `npm ci --include=dev && npm run qa:release-migrations && npm run deploy:compile && npm run deploy:predeploy`. It is less ideal: DB changes run during the build, although compilation and migration audit have already passed.

## Existing P3009 incident: automatic but narrowly guarded

`scripts/deploy-migrations.mjs` normally just calls Prisma `migrate deploy`; it neither retries nor auto-resolves arbitrary failed migrations.

Only if Prisma specifically returns **P3009** naming `0008_task_007_academic_sessions`, it:
1. Connects using `DIRECT_URL`, reads `_prisma_migrations` and requires **exactly one** unresolved migration matching `0008` and the original PostgreSQL error `42804` for `academic_sessions_school_id_fkey`.
2. Inspects the database objects for 0008, requiring **exactly one** of two verified recovery states:
   - **Completely rolled back:** `academic_sessions` table, `AcademicSessionStatus` enum and its five indexes are all absent. Confirms `schools.id` is UUID, then records 0008 as `--rolled-back` and allows the corrected migration to run normally.
   - **Partially applied:** the expected `academic_sessions` table exists with exactly the known shape and **zero rows**. Locks the table, converts only its school ID from VARCHAR to UUID, adds the missing FK in a transaction, verifies its schema, then marks 0008 `--applied`.
3. No production school, student, fee, payment, or other existing data tables are deleted or reset.
4. If any prerequisite fails (including missing table **with leftover enum/indexes**, nonempty table, differing schema, missing `DIRECT_URL`, or unrelated failures), aborts deployment without a generic repair.

**One-time recovery is not a substitute for a backup.** Establish and verify a Neon restore point first, preferably rehearse against a Neon clone. Application-level data integrity and recovery should also be validated. Other future migration failures will remain blocked for investigation: automatic cleanup of arbitrary migrations is unsafe.

## Future migration safeguards

- `scripts/migration-history-lock.json` locks all 14 existing migration SQL blobs. Do not edit old migration files after they have been shipped; add new numbered migrations instead.
- New migration SQL must use explicit `BEGIN; ... COMMIT;` and the release guard blocks common destructive operations. It is a conservative gate, not a SQL parser and not a guarantee of data safety.
- Each new migration must be rehearsed on a restored copy of real, appropriately protected data (including nonempty tables). Review runtime/lock cost, uniqueness, backfill, defaults, FK type compatibility, indexes, and tenant boundaries.
- Prefer **expand → deploy code → backfill → contract** across multiple releases. Never drop columns used by running API or worker versions.
- Use database backups / point-in-time restore and test restores. A failed Render deployment does not roll back database changes.
- Avoid migration races across multiple services: only the designated API pre-deploy executes migrations; worker/web deployments do not run migration commands.
- Never run `prisma migrate reset`, `db push --force-reset`, `DROP ... CASCADE` or uncontrolled `migrate resolve` in production.
- Deploy fails **closed** for unexpected Prisma P3009/P3018, drift, data incompatibilities or failed validation. Unexpected errors require diagnosis; do not automatically mark them applied or rolled back.

## Release QA

Run locally before approving the deployment:
```bash
npm ci --include=dev
npm run qa:release-migrations
npm run deploy:compile
```

On a Neon **clone of production**, perform the same pre-deploy step, check all 14 migrations, compare counts/data, run API smoke tests, and confirm old and new API compatibility. Validate both empty/fully-rolled-back and partial/empty-table recovery; ensure nonempty/divergent states are rejected. Production credentials and SQL output must not be committed to Git.

## Incident update — 29 Oct 2026

Render confirmed the known 0008 failed migration exists in the ledger but the `academic_sessions` table is **absent**. The former recovery helper rejected that state. The revised helper supports PostgreSQL's atomic rollback only when its related enum and indexes are also absent; it records the failure `--rolled-back` so corrected migration 0008 can re-run. **Neon execution, real-data retention, and complete deployment still require verification.** Keep the build command already configured; no Render setting change is necessary for this correction.
