# TASK-011 — School go-live readiness and first-operator bootstrap

**Owner:** School · **Requires:** TASK-001, TASK-007 · **Policy gate:** POLICY_CONFIRMATION · **Review risk:** **HIGH** · **Live status/evidence:** [TASK-TRACKER](../TASK-TRACKER.md).

## 1. Complete task acceptance
**User story:** As a school operator I can school go-live readiness and first-operator bootstrap.

**Cases to demonstrate:** UC1: new school has name but no active session/classes; readiness shows deficiencies. UC2: school has no operator yet because existing provisioning requires ACTIVE school — activation must not deadlock. UC3: legacy ACTIVE school missing session remains operational in compatibility mode until migrated. UC4: activation review confirms optional vs mandatory criteria.

**Policy/eligibility:** Client must classify each criterion mandatory/warning. Current code requires school ACTIVE *before* creating operator, so requirement 'operator before activation' contradicts existing order. Design must resolve with safe provisional operator (INACTIVE until school active) or revised activation protocol; never strand first tenant. Existing ACTIVE schools grandfathered with warnings, not suddenly disabled.

**Concrete golden scenario:** E2E school DRAFT → Platform Admin year setup/class → active → first operator login, with no circular dependency or cross-school access. This task is independently useful without any higher-numbered task or future service. If policies are unresolved, mark BLOCKED in the tracker; do not silently choose a finance/identity behavior.

## 2. Current code, domain ownership and DB DLD
**Inspect real existing files first:** `apps/api/src/modules/platform-admin/schools/schools.service.ts`<br>`apps/api/src/modules/platform-admin/operators/operators.service.ts`<br>`apps/web/src/app/admin/(protected)/schools/[schoolId]/ui.tsx`

**Schema and migration contract from requirement:** SchoolReadinessCheck view/dto, derived from authoritative School, AcademicSession, classes/sections, operators, logo/principal if required. Optional audit row SchoolActivationReview(schoolId,version,criteriaVersion,blockingCodes,warnings,acknowledgedBy,time); no redundant mutable 'readiness' flag in school unless cached revisioned projection.

**Detailed new DB behavior:** Build read-only readiness projection per school with checks for academic year, classes, sections, school profile and operator; classify each configurable check BLOCKER/WARNING per explicit client choice.

**Schema release protocol:**
1. Capture current School A & B enrollment/fee/payment/TC counts, IDs and state in a **disposable cloned/seeded** environment. Prepare rollback that preserves old finance snapshots.
2. Expand schema with new tables/nullable references and same-school foreign keys. Write an additive Prisma migration plus any necessary reviewed SQL (partial uniqueness, date constraints). Do not force historical unknown values.
3. If backfill needed, run an idempotent preview and per-school reconciliation; do not convert uncertain legacy enrollment into invented academic dates or external collections into new SaaS receipts.
4. Protect old API via adapter; test old reads, writes, report totals and year/status before enabling new writer. Feature-flag per tenant where change alters financial or enrollment state.
5. Document verified counts, migration duration/locks, rollback/roll-forward plan and any discrepancy in single tracker. No hard DROP/RESET as rollback.

## 3. API / DTO / authorization DLD
**Original design contract proposal:** GET /platform/schools/:id/readiness; POST /platform/schools/:id/activate {expectedVersion,readinessVersion,confirmWarnings}; preserve existing status route with compatible validation. Use the already implemented TASK-007 **Platform Admin session bootstrap** for DRAFT schools. For operator readiness, choose a consistent approved path: (A) a secure **provisional operator** created with PlatformAdminGuard while School DRAFT and unable to authenticate until School ACTIVE, OR (B) mark NO_OPERATOR as a **warning** until after school activation, when existing operator provisioning works. Do not make it a blocker unless path A is fully implemented and tested.

**Implementation contract:** implement typed request schema in `packages/validation` and response DTO in `packages/contracts`, no runtime-only `any` bypass; actor school from session, ADMIN route separately guarded, MANAGER permission on write and report-viewer only on explicitly permitted pure reads. School+record FK verified server-side; return **401** expired login, **403** missing ability, **404** foreign-school ID, **409** optimistic version/race/duplicate, **422** incorrect input, **503** unavailable queue/storage only when relevant. Preserve existing HTTP method/body/response or provide supported adapter tested before switching web clients. Writes CSRF + audit + request ID and idempotency where payment/year transition is involved.

**Concrete API behavior:** Use TASK-007 PlatformAdmin year bootstrap while School DRAFT. If operator before activation is mandatory, implement a PROVISIONAL operator state with no login until School ACTIVE, otherwise show NO_OPERATOR as warning and use existing activate→operator-create sequence.

## 4. Service/repository algorithm — implement in this order
1. Use TASK-007 PlatformAdmin year bootstrap while School DRAFT. If operator before activation is mandatory, implement a PROVISIONAL operator state with no login until School ACTIVE, otherwise show NO_OPERATOR as warning and use existing activate→operator-create sequence.
2. Update existing /platform/schools/:id/status via compatibility adapter: under school-row lock re-evaluate checklist/version before ACTIVE transition; existing ACTIVE schools are grandfathered with warning (do not lock them out).
3. UI readiness screen shows exact action links, successful review/confirm and stale version 409 refresh; never require optional transport/fee configuration for a school that does not use it.
4. E2E school DRAFT → Platform Admin year setup/class → active → first operator login, with no circular dependency or cross-school access.

**Inter-module integration currently proposed:** Readiness composer uses school-owned data and AcademicsPublicFacade; returns codes e.g. MISSING_ACTIVE_YEAR / NO_ACTIVE_CLASS / NO_SECTION / NO_OPERATOR (if supported), minRequired true/false per config. Platform admin UI card with checklist, links to fix, warning vs blocker, confirm; atomic activation re-evaluates readiness under school row lock.

**Failure handling:** Avoid false-negative when deliberate school without transport/fee configs; readiness should not require features the school won't use. School deactivation/reactivation uses same logic but legacy access policy agreed. Operator-creation deadlock is P0; test the exact DRAFT→ACTIVE→first-operator/login sequence and both decision variants. Existing ACTIVE school must not become unavailable if it predates session setup. Every mutation that spans modules is done through owned facade commands and a durable outbox/coordinator, not direct sibling-model SQL.

## 5. UI / navigation DLD
- Use existing operator/admin Next.js route, API client and design tokens. Do not hide old actions, invent an unavailable destination or make report navigation grant a forbidden action.
- State model: initial/skeleton → ready/empty → editing → validating → submitting → success or 409 stale/422 invalid or 503 retry. Retain user's input after recoverable failure; prevent double-submit.
- Form fields, labels, date formats, source-of-truth totals and role-based controls follow the task's contract above. Provide clear messaging for missing legacy mapping and prior paid records; no raw database enum/UUID where a human-readable label exists.
- Verify desktop (1366px), tablet (768px), mobile (360px), print when relevant, keyboard, labels/focus and long schools/student names. A redesign may change layout but must preserve old workflow end-to-end.
- **Exact UI and school examples:** E2E school DRAFT → Platform Admin year setup/class → active → first operator login, with no circular dependency or cross-school access.

## 6. Executable FE / BE / NFR tests
**FE interactive cases:** TASK-011-FE01 user journey on 360/768/1366; TASK-011-FE02 invalid form; TASK-011-FE03 old user journey.
  
**BE unit, integration, DB and security cases:** TASK-011-BE01 service API; TASK-011-BE02 tenant isolation; TASK-011-BE03 transaction race.

**NFR, reliability, performance and privacy cases:** TASK-011-NFR01 load target; TASK-011-NFR02 privacy; TASK-011-NFR03 DB migration/rollback.

**Additional negative cases that must pass:** API called without CSRF; school B UUID from school A; wrong role with valid auth; duplicate retry; stale version; old record/empty nullable field; process crash during async step if used. Unit mocks are insufficient—test with real isolated PostgreSQL/Redis/file service where changed.

**Existing behavior regression mandatory:** BASE-02,03,04,16. Rerun relevant [BASE-XX workflows](../REGRESSION-BASELINE.md) before and after. No task is successful if the new behavior works but old user functionality breaks.

## 7. Completion evidence and rollout
Produce PR diff (source files/DTO/API), migration SQL, before/after screenshots and API snapshots, actual FE/BE/NFR logs, cross-tenant/money invariants, p50/p95 (where changed), previous document checksum if applicable, backup/recovery result and reviewer comment. **Only after approved integration** change the single tracker status to DONE. The task document itself has no mutable status.
