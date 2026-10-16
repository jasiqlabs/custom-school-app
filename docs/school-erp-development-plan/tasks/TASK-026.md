# TASK-026 — Historical year selector, reporting and exports

**Owning module:** Reports · **Prerequisite IDs:** TASK-002, TASK-010, TASK-019 · **Policy/spec gate:** SPEC_SYNC_REQUIRED · **Reviewer risk:** **HIGH** · **Status:** only in [TASK-TRACKER.md](../TASK-TRACKER.md).

## 1. What the user receives (not just a backend change)
**Operator/school story:** As an authorized school manager or reports viewer, I choose a historical academic year and download student/fee/transport reports with the correct as-of enrollment and financial context.

**Existing requirement acceptance:** UC1: inspect a previously mapped academic year, regardless of CLOSED status, for 2025–26 students with original class/section. UC2: export 2026–27 fee report with original charge months and separate now-collected historical payments. UC3: current-year dashboard remains current by default. UC4: reports-only operator may download only allowed reports. UC5: unauthorized school/year filter is 404.

**Business policies and scope limit:** Backend holds report source-of-truth; never aggregate by today's class instead of selected historical class. Report request filter snapshots must include schoolId, yearId, asOf date and actor capability. Reader scopes enforced by FB roles from TASK-001/002; historic report views immutable, exported snapshots reproducible. No code should invoke any higher-numbered unfinished task; where future work is expected, expose only a tested extension point now.

**Golden demonstration:** Two years with a student's different classes and ₹400 old dues show year-specific class and source debt correctly; report-viewer can download approved report but not student private profile.

## 2. DLD — Domain schema and migration

**Existing source to inspect:** `apps/api/src/modules/operator-dashboard/application/dashboard.service.ts`<br>`apps/api/src/modules/fees/application/fee-exports.service.ts`<br>`apps/web/src/app/operator/ui.tsx`

**Proposed persisted records and invariants:** No duplication of StudentEnrollment or FeeCharge. Add report-read indices (schoolId,academicSessionId,feePeriod), report job frozen input {schoolId,academicSessionId,asOfDate,filters,actorId,capability,templateVersion} with authorized private file mapping. School+year in cache keys.

**Concrete domain model:** Existing Student year selector becomes reusable Reports selector; all read projections scoped by school+academicSessionId and explicit report 'as of close' vs 'remaining today' semantics. Save filters and authorizing actor on export job.

**DB release sequence:** EXPAND nullable/new schema and composite school foreign keys; preserve `Student.id`, existing enrollment/payment/TC/file IDs; verify old code compatibility in isolated two-school fixture; deterministic historic backfill with approved verified mapping; compare before/after counts, affected monetary totals, file checksums. Apply partial unique index and date overlap constraints in reviewed Prisma+SQL migration. If already posted payments or issued certificates exist, use audited forward correction—not deleting finance tables or rolling back student identities.

## 3. DLD — API and public facade contracts

**Existing requirement HTTP design:** GET /operator/reports/yearly-students?academicSessionId, GET /operator/reports/yearly-fees?academicSessionId&asOfDate, GET /operator/reports/yearly-transports?academicSessionId only if existing transport effective histories support date; POST/report XLSX job followed by authorized GET status/download. Old pending-fee report URLs remain compatible. 403 non-report role, 404 foreign year, 422 invalid asOf.

**Typed API requirements:** Request JSON uses school-scoped IDs, ISO business DATE and version/idempotency; for manager actions enforce OperatorGuard + capability + CsrfGuard, for Platform Admin guard separately, for downloads enforce current school/signed-file authorization. 401 unauth, 403 forbidden, 404 foreign object, 409 stale/concurrent/illegal transition, 422 invalid date/class, 503 job/outbox unavailable. Old URLs/requests continue through compatibility adapters and are tested. Public domain facade owns reads/mutations; orchestrator coordinates via opaque port (no cross-owner Prisma table writes).

## 4. DLD — Implementation sequence and UI screens

1. Reports aggregate student Enrollment history and Fees Charge origin/date via public facades, not raw sibling tables. Transport date-effective history only when data available; do not invent past route data.
2. Use current report endpoints with backward-compatible optional academicSessionId; new PDF/XLSX job freezes session/filter/asOf and rechecks role/school at signed retrieval. No unreviewed all-years aggregations.
3. UI reports show selected year, closed/read-only context, exact label for month versus current outstanding, export filename/year and human-readable legacy mapping warning.
4. Two years with a student's different classes and ₹400 old dues show year-specific class and source debt correctly; report-viewer can download approved report but not student private profile.

**Additional service behavior in original scope:** Extend existing YearSelector TASK-010 to Reports & fee/dashboard export routes only after their backend data is ready, show selected year + as-of report label, no edit CTA on old years. Reports facade composes bulk batched StudentsPublicFacade/FeesPublicFacade/TransportPublicFacade summaries; owns no sibling DB reads. XLSX job freezes filter and school in trusted snapshot; signed URL only after capability+tenant recheck.

**Failure and retry behavior:** Report 'total outstanding at year close' differs from 'old-session remaining as of today', label them separately. School may lack legacy year mapping: warn 'history unverified', not fake previous classes. Ensure report-viewer cannot infer protected Aadhaar/private data via export.

**UI state matrix:** loading, empty, ready, editing/review, submitting, PREPARED/QUEUED/CLOSING where appropriate, success, stale conflict, retryable failure, archived/read-only. Show accurate school/year/class and correct current vs historic context. No misleading 'completed' status while async steps still running. Validate at 360px/768px/1366px; accessible labels/keyboard and permission-correct navigation. Any redesigned layout must allow previous workflows.

## 5. FE/BE/NFR test plan (execute, do not just list)

**FE:** TASK-026-FE01 happy path; TASK-026-FE02 error; TASK-026-FE03 old UI preserved.

**BE unit/API/SQL + authorization:** TASK-026-BE01 API; TASK-026-BE02 school isolation; TASK-026-BE03 idempotency.

**NFR performance/worker/privacy:** TASK-026-NFR01 p95 performance; TASK-026-NFR02 recovery; TASK-026-NFR03 security.

**High-risk task-specific hard assertions:** Two years with a student's different classes and ₹400 old dues show year-specific class and source debt correctly; report-viewer can download approved report but not student private profile. For async tasks kill the worker after each step, resume without duplicates. For academic transitions verify old ledger origin/snapshot and no phantom active enrollment. For files verify old PDF SHA and signed URL expiration. For numbering verify concurrency uniqueness. Test invalid/stale versions and cross-school IDOR with real PostgreSQL transactions.

**Required existing-product regression:** BASE-05,07,11,12 (see [REGRESSION-BASELINE](../REGRESSION-BASELINE.md)). Capture BEFORE/AFTER screen recordings or screenshots and matching API/DB outputs.

## 6. Definition of Done and safe implementation gate

The task works **alone plus listed earlier prerequisites**; no later CTA/API is needed. UI, backend and NFR evidence has been executed, not inferred from Jest mocks. Database migration is rehearsed without destructive resets and approved rollback/roll-forward plan. Original login, admission, class changes, monthly fees, collections/void, reports, transport and platform TC remain functional as applicable. Reviewer must sign off P0 changes, and only then update the **one tracker** with PR, test results, baselines, review and eventual DONE after approved merge.
