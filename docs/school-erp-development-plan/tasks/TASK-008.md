# TASK-008 — Session-scoped student enrollment and migration

**Owner:** Students · **Requires:** TASK-007 · **Policy gate:** SPEC_SYNC_REQUIRED · **Review risk:** **HIGH** · **Live status/evidence:** [TASK-TRACKER](../TASK-TRACKER.md).

## 1. Complete task acceptance
**User story:** As a school operator I can session-scoped student enrollment and migration.

**Cases to demonstrate:** UC1: same student ID enrolled in Nursery A (2026–27), LKG B (2027–28). UC2: parent requests old admission form or TC for previous year. UC3: current class renamed and prior-year print must preserve originally recorded label. UC4: import legacy rows without clear session with operator reconciliation screen.

**Policy/eligibility:** Every StudentEnrollment belongs to school-owned AcademicSession with historical class/section snapshots; preserve current endpoints through active-year default adapter and verify legacy mapping before enforce NOT NULL.

**Concrete golden scenario:** Create BEFORE/AFTER comparison for year, class/section, student counts, fee dues, TC snapshot. Existing import, profile, class update and search must still work. This task is independently useful without any higher-numbered task or future service. If policies are unresolved, mark BLOCKED in the tracker; do not silently choose a finance/identity behavior.

## 2. Current code, domain ownership and DB DLD
**Inspect real existing files first:** `prisma/schema.prisma`<br>`apps/api/src/modules/students/application/admit-student.service.ts`<br>`apps/api/src/modules/students/application/search-students.service.ts`<br>`apps/api/src/modules/students/repository/students.repository.ts`

**Schema and migration contract from requirement:** Add StudentEnrollment.academicSessionId nullable initially, endedReason, effective dates and class/section name snapshots; composite same-school FK to AcademicSession(schoolId,id). Partial unique active enrollment index on (schoolId,studentId,academicSessionId) and temporal-overlap protection with approved rules. Migrate via legacy map table and verified backfill; only make FK non-null once all rows explicitly mapped.

**Detailed new DB behavior:** Every StudentEnrollment gets school-owned AcademicSession reference (nullable during migration). Add segment version, original class/section name snapshot and a verified legacy-mapping status. Composite school FKs and partial active-per-student/year uniqueness; old student UUID never changes.

**Schema release protocol:**
1. Capture current School A & B enrollment/fee/payment/TC counts, IDs and state in a **disposable cloned/seeded** environment. Prepare rollback that preserves old finance snapshots.
2. Expand schema with new tables/nullable references and same-school foreign keys. Write an additive Prisma migration plus any necessary reviewed SQL (partial uniqueness, date constraints). Do not force historical unknown values.
3. If backfill needed, run an idempotent preview and per-school reconciliation; do not convert uncertain legacy enrollment into invented academic dates or external collections into new SaaS receipts.
4. Protect old API via adapter; test old reads, writes, report totals and year/status before enabling new writer. Feature-flag per tenant where change alters financial or enrollment state.
5. Document verified counts, migration duration/locks, rollback/roll-forward plan and any discrepancy in single tracker. No hard DROP/RESET as rollback.

## 3. API / DTO / authorization DLD
**Original design contract proposal:** Existing /operator/students listing/profile/admission-form take optional academicSessionId with server validated school/session ownership; add GET /operator/students/:id/enrollments?academicSessionId. POST admission includes active session selection/inference; return explicit sessionId and enrollmentVersion in response.

**Implementation contract:** implement typed request schema in `packages/validation` and response DTO in `packages/contracts`, no runtime-only `any` bypass; actor school from session, ADMIN route separately guarded, MANAGER permission on write and report-viewer only on explicitly permitted pure reads. School+record FK verified server-side; return **401** expired login, **403** missing ability, **404** foreign-school ID, **409** optimistic version/race/duplicate, **422** incorrect input, **503** unavailable queue/storage only when relevant. Preserve existing HTTP method/body/response or provide supported adapter tested before switching web clients. Writes CSRF + audit + request ID and idempotency where payment/year transition is involved.

**Concrete API behavior:** Create StudentEnrollmentRepository queries `getCurrentEnrollment(schoolId,studentId,sessionId)` and `listEnrollmentHistory` rather than global latest enrollment fallback. Existing students APIs use a compatibility adapter until mappings are verified.

## 4. Service/repository algorithm — implement in this order
1. Create StudentEnrollmentRepository queries `getCurrentEnrollment(schoolId,studentId,sessionId)` and `listEnrollmentHistory` rather than global latest enrollment fallback. Existing students APIs use a compatibility adapter until mappings are verified.
2. Backfill cannot infer original year from today's class; give migration preview of mapped/ambiguous/unknown and obtain per-school approval. Leave ambiguous row nullable with explicit warning; do not make FK NOT NULL until verified.
3. Admission and import must create an enrollment for the resolved active year, while legacy mode keeps existing admission possible on unmigrated tenants; never duplicate student identity.
4. Create BEFORE/AFTER comparison for year, class/section, student counts, fee dues, TC snapshot. Existing import, profile, class update and search must still work.

**Inter-module integration currently proposed:** Students aggregate owns enrollment writes; AcademicsPublicFacade validates year and writable state; class/section verified same-school before INSERT. History queries use saved name snapshots where appropriate. Web student directory/session selector and history timeline render current/historic period separately. TC obtains StudentsPublicFacade.snapshotAtSession rather than querying student tables.

**Failure handling:** Backfill cannot infer old class from current class if history absent; mark 'legacy unverified' until school confirms. Reenrollment after returning must not steal prior row. No constraint implying only one enrollment over all years in new design. Every mutation that spans modules is done through owned facade commands and a durable outbox/coordinator, not direct sibling-model SQL.

## 5. UI / navigation DLD
- Use existing operator/admin Next.js route, API client and design tokens. Do not hide old actions, invent an unavailable destination or make report navigation grant a forbidden action.
- State model: initial/skeleton → ready/empty → editing → validating → submitting → success or 409 stale/422 invalid or 503 retry. Retain user's input after recoverable failure; prevent double-submit.
- Form fields, labels, date formats, source-of-truth totals and role-based controls follow the task's contract above. Provide clear messaging for missing legacy mapping and prior paid records; no raw database enum/UUID where a human-readable label exists.
- Verify desktop (1366px), tablet (768px), mobile (360px), print when relevant, keyboard, labels/focus and long schools/student names. A redesign may change layout but must preserve old workflow end-to-end.
- **Exact UI and school examples:** Create BEFORE/AFTER comparison for year, class/section, student counts, fee dues, TC snapshot. Existing import, profile, class update and search must still work.

## 6. Executable FE / BE / NFR tests
**FE interactive cases:** TASK-008-FE01 user journey on 360/768/1366; TASK-008-FE02 invalid form; TASK-008-FE03 old user journey.
  
**BE unit, integration, DB and security cases:** TASK-008-BE01 service API; TASK-008-BE02 tenant isolation; TASK-008-BE03 transaction race.

**NFR, reliability, performance and privacy cases:** TASK-008-NFR01 load target; TASK-008-NFR02 privacy; TASK-008-NFR03 DB migration/rollback.

**Additional negative cases that must pass:** API called without CSRF; school B UUID from school A; wrong role with valid auth; duplicate retry; stale version; old record/empty nullable field; process crash during async step if used. Unit mocks are insufficient—test with real isolated PostgreSQL/Redis/file service where changed.

**Existing behavior regression mandatory:** BASE-06,07,08,09,14. Rerun relevant [BASE-XX workflows](../REGRESSION-BASELINE.md) before and after. No task is successful if the new behavior works but old user functionality breaks.

## 7. Completion evidence and rollout
Produce PR diff (source files/DTO/API), migration SQL, before/after screenshots and API snapshots, actual FE/BE/NFR logs, cross-tenant/money invariants, p50/p95 (where changed), previous document checksum if applicable, backup/recovery result and reviewer comment. **Only after approved integration** change the single tracker status to DONE. The task document itself has no mutable status.
