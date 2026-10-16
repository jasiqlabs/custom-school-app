# Intern / Local Agent Runbook — Build, Test, Refactor, Review

**Audience:** intern/junior developer and supervising engineer. **Project:** working multi-tenant School ERP; change set TASK-001…TASK-035. **Always read** [README](README.md), the [single tracker](TASK-TRACKER.md), the assigned task brief, [REGRESSION-BASELINE](REGRESSION-BASELINE.md), [ARCHITECTURE](ARCHITECTURE.md), [DECISIONS](DECISIONS.md) and `AGENTS.md`.

## 0. Absolute safety rules (apply whether rewriting code or just a one-line edit)

1. You **may refactor or redesign** UI, API, DTOs, domain/services, database schema and code structure if the new result meets the approved user story and **preserves all unrelated working user journeys**. An architectural cleanup is allowed; losing functionality is not.
2. **Never change `main` directly.** Make one small named implementation branch from latest verified stable `main`. Implement only assigned task and its accepted prerequisites. Don't merge to `main` yourself without explicit reviewer authorization; preparation does not imply merge approval.
3. **Before code:** compare with baseline behavior. Take screenshots and save response/output samples on *synthetic* 2-school fixtures. Capture baselines for affected screens, fee amounts, API errors, downloads and timings. Do not store real Aadhaar or secrets in evidence.
4. **During code:** use existing NestJS/Next.js/Prisma/Zod/contract conventions, server session-derived schoolId, capability guards, CSRF, audit, private files and BullMQ job-ID-only queue. No direct cross-module Prisma access in new code; use owned facades/ports.
5. **Financial/doc changes:** no alteration of issued fee receipts, TC files, student UUIDs or existing financial facts. Migrate additively and reconcile all old rows; never reset seeded/production DB to 'fix' a migration. Use correct Decimal amounts.
6. **No unfinished future links:** this task must be independently deployable with only tracker-listed predecessors. Do not call a future endpoint, render a dead button or add undocumented functionality. Keep incomplete integrations feature-flagged and default-off.
7. **Never mark DONE from a green Jest unit test alone.** Show actual FE interactions, BE database/API behavior, security negative cases and NFR measurements, plus legacy regression. Reviewer independently signs off.
8. **Do not bypass test failures** by deleting old test assertions, weakening validation, turning security off or reducing test coverage. If an old expectation intentionally changes with approved requirements, update both contract and test and explain in PR with before/after evidence.

## 1. Exact source and worktree workflow

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git status --short
git rev-parse HEAD
# Read AGENTS.md and current approved Harness project docs before coding.
git switch -c feature/school-erp-task-XXX-short-name
```

**Repository fact:** `main` is the stable base; repository default branch may point somewhere else. Do not fetch files without an explicit ref when validating stable code. No runtime changes were made by this planning branch.

**Toolchain:** root `package.json` uses npm workspaces and `npm@11.17.0`; root scripts include `qa:static`, `prisma:generate`, `test`, `build`. **At inspected main SHA no package-lock was committed**: `npm ci` may fail; consult current dependency policy, Node/npm versions and approved lockfile practice before install. If lockfile introduction is necessary, review it as an explicit dependency change.

**Example install/test commands after dependencies and local services are configured:**

```bash
npm install
npm run prisma:generate
npm run qa:static
npm --workspace apps/api test -- --runInBand
npm test
npm run build
```

These are commands to **execute**, not evidence that they have passed. For integration tests use isolated test Postgres, Redis and private storage with env set according to README/deployment guide; NEVER point a test command or cleanup script at production. `npm run prisma:migrate` runs `prisma migrate deploy`; run only on disposable test DB for first migration rehearsals.

**FE testing warning:** `apps/web/package.json` currently defines `test` as a call to static QA; `apps/worker` likewise. This does NOT test actual browser behavior, rendering, form edits or background jobs. The intern must run the affected UI locally in the browser and record interactions and responsive screenshots; an approved automated browser integration test tool may be added when agreed, but a written claim of web E2E PASS from static QA alone is unacceptable.

## 2. Each task: exactly what to do, in order

**A. Claim the task**
- Open `TASK-TRACKER.md`, check ID, prerequisites `DONE`, gate/decision, current assignee. Write your name, branch, baseline SHA and date; set `IN_PROGRESS` (or `BLOCKED` and reason). Commit tracker update. Handle concurrent row edits by rebase.
- Open `tasks/TASK-XXX.md`. Rewrite the requirement *in your own short implementation checklist* and identify the existing files/owners/API DTO, UI route, Prisma table and test you will touch. Do not code if the task is ambiguous; ask the assigned reviewer to resolve only concrete unknowns.

**B. Make a before-state evidence pack**
- Seed **two schools A/B**, at least two operator roles (once TASK-001 exists), existing student with Aadhaar, no Aadhaar after TASK-004, sample classes/sections, fee paid/partial/void, transport assignment, TC, logo.
- Reproduce applicable `BASE-XX` journeys from [REGRESSION-BASELINE](REGRESSION-BASELINE.md); record URLs, screenshots at 360/768/1366, network API request/response, source DB totals/IDs, failed-login/403 and latency. The same evidence scenario must be repeatable after the change.
- Review `tests/*.spec` or colocated `*.spec.ts` and any test script. If no automated coverage exists for your changed screen/service, create it or document manual gap with supervising engineer.

**C. Implementation design checkpoint (before schema/API rewrite)**
- Write a tiny PR plan: files and module owner, new+old endpoint DTOs, migration and backfill, feature flag, error paths, concurrency, index/query plan, rollback. Have reviewer approve high-risk plans **before coding**.
- Use typed DTO/Zod, opaque transaction/port interface, no generic `any` or broad catch as security workaround. Reuse existing facade implementations where possible instead of duplicating ledger/year/TC logic.
- Add focused tests **that fail** for newly requested behavior; keep original tests until behavior is reviewed.

**D. Incremental development**
- Implement BE service/domain+database with transaction/audit/idempotency and negative cases; then FE web interaction with loading/error/empty state and responsive layout. Order can vary for UI-only tasks.
- After every meaningful change run targeted tests, type/build and the impacted `BASE-XX` journeys. If an old feature stops working, fix it in the same task branch; do not leave a broken state for next task.
- Never change multiple finance/academic state-machine designs by guesswork. Use approved decisions/criteria and senior code review.

**E. Three required QA lanes — all mandatory**
1. **FE:** actual browser open and click through every step; check valid/invalid submissions; network failure; spinner; keyboard and screen reader labels; mobile 360, tablet 768 and desktop 1366 widths; print/PDF if relevant. Recheck old working screens with before/after evidence.
2. **BE:** named unit/API integration/DB tests, two-school 404/403, wrong role, CSRF, expired session, concurrency, idempotency, duplicate click, missing/invalid values, previous-year/legacy rows, auditable rollback. No production credentials.
3. **NFR:** record workload and p50/p95, SQL EXPLAIN for changed queries, worker retry/crash or file integrity if relevant, 500-student normal + 5k stress fixtures, no-store/private files/PII redaction, WCAG 2.1 AA behavior, no DB data loss or financial mismatch. State exact environment and comparison to baseline; do not invent test results.

**F. Review, merge and tracker**
- Attach `git diff --check`, relevant commands and results, table of approved use cases, FE screenshots, API/status snapshots, DB reconciliation, migration rollback rehearsal, NFR timing data and known issues. Run root static+API+build checks.
- Mark `DEV_DONE` only after implementation; `QA_IN_PROGRESS` during verification; `QA_FAILED` with reproducible error if anything fails; `READY_FOR_REVIEW` only when all mandatory evidence supplied.
- Reviewer cross-checks change against existing product baselines, security and canonical story/DLD, explicitly approves any intentional UX/API difference and migration. Only after approved integration/merge into designated stable base can `DONE` be used.

## 3. What counts as a breaking change

Any of these fails the task even if new feature looks attractive:
- A previously working button/form/nav/report/export/download becomes missing, unusable or misleading without an explicitly reviewed replacement.
- Admin/operator authentication, platform/school authorization, session revocation or CSRF protections change unintentionally.
- Student admission/import/search/profile, class/section and transport assignment flow stops working on existing school data.
- An existing due/payment/receipt/TC changes amount, student, school, status, original reference or disappears; fees accidentally double-post after migration.
- Historical class/year loses identity, school B records accessible to school A, or user sees private Aadhaar/logs.
- PDF printing clips/loses ₹/school identity or can't download old version; async worker silently fails.
- New query significantly regresses previously accepted performance budget without measured justification and a reviewed remediation.
- Changing UI text or layout is not inherently breaking **if the operator can still complete all approved functional journeys with equal or better accessibility**.

## 4. Change-risk tiers and approval

| Risk | Examples | Who reviews before merge |
|---|---|---|
| Lower | School code fields, landing layout, admission print layout | Senior developer checks affected UI, API and smoke tests |
| Medium | Year selector, class history, role menus, receipt template | Senior developer + domain owner, API migration review |
| **High** | Role guards/session revocation, Aadhaar encryption, payment ledger, fee eligibility, historic migration, student exit/promotion, TC issuance/clearance and async private files | **Senior architect/DB/security reviewer** + domain owner, plus independent FE/BE/NFR evidence |

If task size/risk is too high for one intern PR, create a **series of implementation PRs tied to the same TASK-XXX** (schema-expand/ports; service; FE; tests/cutover), with safe feature toggles and no interim broken main. Do **not** create competing task trackers or mark DONE after only a partial PR.

## 5. Intern PR description template

```text
TASK ID:
Owner / reviewer:
One sentence user-visible outcome:
Current main SHA / work branch:
Prior task prerequisites (DONE links):
Policy decision and canonical PRD/HLD/DLD references:
Current affected files/routes/tables:
BE/API schema changes and compatibility adapter:
FE routes/components and preserved legacy journeys:
Feature toggles and rollout/rollback:
New FE tests (IDs, actual/expected, screenshots):
New BE tests (IDs, actual/expected, 2-tenant negative):
NFR proof (tool, data size, p50/p95, previous/after, worker/file/privacy):
BASE-XX regressions rerun and pass/fail:
All test commands + actual exit status:
Migration reconciliation / restore rehearsal:
Open risks and independent reviewer sign-off:
Tracker commit/status:
```

## 6. Design mismatch rule

If a task's proposed field, route, validation or screen differs from inspected current `main` or canonical Harness DLD, **do not invent implementation to make the prose fit**. Open an explicit design clarification with old vs proposed behavior, user impact, migrations and alternatives; obtain owner approval; then implement the reviewed adaptation and update the task brief. This pack is a guided design, not permission to break existing contracts.
