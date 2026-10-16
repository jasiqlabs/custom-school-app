# TASK-014 — Fee applicability by admission, class change and exit dates

**Owner:** Fees / Students · **Requires:** TASK-009, TASK-013 · **Policy gate:** POLICY_CONFIRMATION · **Review risk:** **CRITICAL** · **Live status/evidence:** [TASK-TRACKER](../TASK-TRACKER.md).

## 1. Complete task acceptance
**User story:** As a school operator I can fee applicability by admission, class change and exit dates.

**Cases to demonstrate:** UC1: admitted August: fees for August onward under confirmed charging convention, not April–July. UC2: leaves in November: December tuition/transport not generated, but October unpaid remains. UC3: changes Class 2 to Class 3 mid-October: October charged according to approved boundary rule, November at new class rate. UC4: late backdated changes require preview adjustments, not silently recalculating receipts.

**Policy/eligibility:** Make charge eligibility derive from effective-dated enrollment and admission date. Define monthly charge start/end and mid-month class-change pricing via approved per-school policy and data snapshots.

**Concrete golden scenario:** Test August admission April–July no charges; Class 2→3 October price follows policy; November exit stops December charge, but November/October unpaid original debts persist. This task is independently useful without any higher-numbered task or future service. If policies are unresolved, mark BLOCKED in the tracker; do not silently choose a finance/identity behavior.

## 2. Current code, domain ownership and DB DLD
**Inspect real existing files first:** `apps/api/src/modules/fees/application/generate-dues.service.ts`<br>`apps/api/src/modules/students/application/update-student-profile.service.ts`<br>`apps/api/src/modules/transports/application/end-transport.service.ts`

**Schema and migration contract from requirement:** Enrollment with validFrom/validTo DATE and reason. FeeEligibilityPolicy(schoolId,policyVersion,startConvention,endConvention,changeConvention,prorationRule?) with approved enum values; FeeCharge records ruleVersion, classSnapshot, enrolledPeriod, category, originSession and dueDate. For mid-year class change use an enrollment segment per effective change.

**Detailed new DB behavior:** Create school-scoped and versioned FeeEligibilityPolicy: first charge month for admission, final charge month on exit, mid-month proration/no-proration and intra-month class-rate rule. Client must explicitly decide; no guess.

**Schema release protocol:**
1. Capture current School A & B enrollment/fee/payment/TC counts, IDs and state in a **disposable cloned/seeded** environment. Prepare rollback that preserves old finance snapshots.
2. Expand schema with new tables/nullable references and same-school foreign keys. Write an additive Prisma migration plus any necessary reviewed SQL (partial uniqueness, date constraints). Do not force historical unknown values.
3. If backfill needed, run an idempotent preview and per-school reconciliation; do not convert uncertain legacy enrollment into invented academic dates or external collections into new SaaS receipts.
4. Protect old API via adapter; test old reads, writes, report totals and year/status before enabling new writer. Feature-flag per tenant where change alters financial or enrollment state.
5. Document verified counts, migration duration/locks, rollback/roll-forward plan and any discrepancy in single tracker. No hard DROP/RESET as rollback.

## 3. API / DTO / authorization DLD
**Original design contract proposal:** GET /operator/students/:id/fees/eligibility-preview?from&to; existing TASK-009 PATCH /operator/students/:id/enrollment {academicSessionId,classId,sectionId,effectiveDate,expectedVersion}; charge generator consumes StudentEnrollmentEligibilityPort by bounded period batches; updates display estimated old/new month impact.

**Implementation contract:** implement typed request schema in `packages/validation` and response DTO in `packages/contracts`, no runtime-only `any` bypass; actor school from session, ADMIN route separately guarded, MANAGER permission on write and report-viewer only on explicitly permitted pure reads. School+record FK verified server-side; return **401** expired login, **403** missing ability, **404** foreign-school ID, **409** optimistic version/race/duplicate, **422** incorrect input, **503** unavailable queue/storage only when relevant. Preserve existing HTTP method/body/response or provide supported adapter tested before switching web clients. Writes CSRF + audit + request ID and idempotency where payment/year transition is involved.

**Concrete API behavior:** Fees owner queries `StudentsPublicFacade.getEnrollmentEligibilityBatch` for start/end and class-effective segments, uses Transport facade for transport service where appropriate and resolves FeeRule effective date. No direct sibling Prisma joins.

## 4. Service/repository algorithm — implement in this order
1. Fees owner queries `StudentsPublicFacade.getEnrollmentEligibilityBatch` for start/end and class-effective segments, uses Transport facade for transport service where appropriate and resolves FeeRule effective date. No direct sibling Prisma joins.
2. Assessment sourceKey includes school/student/category/origin event/period; generator has idempotent guard even across worker retry. Never assess earlier months before admission or later than approved exit end, never auto-backdate when onboarding.
3. When effective date changes after a charge is already paid, produce preview and, only on approved correction, add FeeAdjustment with reason; never mutate old receipt/fee snapshot. Existing monthly generator keeps compatible behavior during staged flag.
4. Test August admission April–July no charges; Class 2→3 October price follows policy; November exit stops December charge, but November/October unpaid original debts persist.

**Inter-module integration currently proposed:** Admission writes start eligibility; already-implemented TASK-009 owns class-change validation and historical segments; this task only projects these dates into fee calculation; fee generator requests eligible class-at-period from Students public port, selects corresponding FeeRule, charges idempotent sourceKey. This eligibility engine already honors effective end dates; it exposes an idempotent stop-accrual port for later callers, but does not invoke any future exit workflow. Backdated corrections use diff preview and FeeAdjustment, not delete.

**Failure handling:** Transport fee may need different start/stop policy than tuition; one-time admission and registration do not repeat monthly; opening-balance items are pre-existing obligations. No assumption that August admission owes earlier months even when fee config effective April. Every mutation that spans modules is done through owned facade commands and a durable outbox/coordinator, not direct sibling-model SQL.

## 5. UI / navigation DLD
- Use existing operator/admin Next.js route, API client and design tokens. Do not hide old actions, invent an unavailable destination or make report navigation grant a forbidden action.
- State model: initial/skeleton → ready/empty → editing → validating → submitting → success or 409 stale/422 invalid or 503 retry. Retain user's input after recoverable failure; prevent double-submit.
- Form fields, labels, date formats, source-of-truth totals and role-based controls follow the task's contract above. Provide clear messaging for missing legacy mapping and prior paid records; no raw database enum/UUID where a human-readable label exists.
- Verify desktop (1366px), tablet (768px), mobile (360px), print when relevant, keyboard, labels/focus and long schools/student names. A redesign may change layout but must preserve old workflow end-to-end.
- **Exact UI and school examples:** Test August admission April–July no charges; Class 2→3 October price follows policy; November exit stops December charge, but November/October unpaid original debts persist.

## 6. Executable FE / BE / NFR tests
**FE interactive cases:** TASK-014-FE01 user journey on 360/768/1366; TASK-014-FE02 invalid form; TASK-014-FE03 old user journey.
  
**BE unit, integration, DB and security cases:** TASK-014-BE01 service API; TASK-014-BE02 tenant isolation; TASK-014-BE03 transaction race.

**NFR, reliability, performance and privacy cases:** TASK-014-NFR01 load target; TASK-014-NFR02 privacy; TASK-014-NFR03 DB migration/rollback.

**Additional negative cases that must pass:** API called without CSRF; school B UUID from school A; wrong role with valid auth; duplicate retry; stale version; old record/empty nullable field; process crash during async step if used. Unit mocks are insufficient—test with real isolated PostgreSQL/Redis/file service where changed.

**Existing behavior regression mandatory:** BASE-06,07,09,10,11,13. Rerun relevant [BASE-XX workflows](../REGRESSION-BASELINE.md) before and after. No task is successful if the new behavior works but old user functionality breaks.

## 7. Completion evidence and rollout
Produce PR diff (source files/DTO/API), migration SQL, before/after screenshots and API snapshots, actual FE/BE/NFR logs, cross-tenant/money invariants, p50/p95 (where changed), previous document checksum if applicable, backup/recovery result and reviewer comment. **Only after approved integration** change the single tracker status to DONE. The task document itself has no mutable status.
