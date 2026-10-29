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
2. Requires the expected partial academic_sessions table, exactly the known columns/indexes/constraints/enum, and locks the table. Requires **zero** rows.
3. In a transaction, changes only `academic_sessions.school_id` from VARCHAR to UUID and creates the missing school FK. It does **not** drop a table, truncate, delete, rewrite existing student/fee/payment records, or use CASCADE.
4. Verifies the repaired schema, uses Prisma `migrate resolve --applied 0008_task_007_academic_sessions` and retries `migrate deploy`.
5. If any precondition fails (including nonempty data, missing expected table, new failure, missing `DIRECT_URL`, or divergent schema), aborts deployment without a generic repair.

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

On a Neon **clone of production**, perform the same pre-deploy step, check all 14 migrations, compare counts/data, run API smoke tests, and confirm old and new API compatibility. Validate that the known-0008 repair refuses nonempty/divergent tables. Production credentials and SQL output must not be committed to Git.

## Current status

Code is prepared in `feature/production-safe-migrations-20261029`. **Not tested against a Neon clone or Render runtime yet.** Until Render commands are updated to use `npm run deploy:predeploy` and the changes are merged, the old Render build still calls `npx prisma migrate deploy` directly and will keep returning P3009.
