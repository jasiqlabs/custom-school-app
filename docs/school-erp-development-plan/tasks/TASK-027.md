# TASK-027 — Receipt and student-number sequence policies

**Owning module:** Foundation / School · **Prerequisite IDs:** TASK-007, TASK-013 · **Policy/spec gate:** SCOPE_CONFIRMATION · **Reviewer risk:** **HIGH** · **Status:** only in [TASK-TRACKER.md](../TASK-TRACKER.md).

## 1. What the user receives (not just a backend change)
**Operator/school story:** As school administrator, I can follow the school's agreed numbering sequence across academic and financial years while never changing an already issued student's identity or receipt.

**Existing requirement acceptance:** UC1: continuous receipt series increments beyond 2027; UC2: academic-year scoped series restarts at 00001 but prefix prevents collision; UC3: financial-year series uses Apr–Mar date boundaries; UC4: student auto-ID rolls over only if configured, never collides with existing studentCode; UC5: old printed documents keep original number after policy changes.

**Business policies and scope limit:** Policy selection must be explicit: CONTINUOUS / ACADEMIC_YEAR / FINANCIAL_YEAR for receipts and separately for Student ID/SR; exact printed prefix, width and reset sequence are client decisions. Internal immutable UUID and `idempotencyKey` remain stable. No reuse of historical receipt numbers in same display scope; prevent current Student ID collision even after year reset. No code should invoke any higher-numbered unfinished task; where future work is expected, expose only a tested extension point now.

**Golden demonstration:** 100 concurrent receipts and student IDs across March/April and year transition result in zero collisions; old receipt/TC/student print references remain unchanged.

## 2. DLD — Domain schema and migration

**Existing source to inspect:** `apps/api/src/modules/fees/domain/receipt-number-allocator.ts`<br>`apps/api/src/modules/students/domain/student-identifier-allocator.ts`<br>`prisma/schema.prisma`

**Proposed persisted records and invariants:** SchoolNumberingPolicy(schoolId,entityType RECEIPT|STUDENT_ID,seriesRule,prefixPattern,width,version,effectiveFrom,changedBy); NumberSequence(schoolId,entityType,seriesKey,lastValue) UNIQUE triple; receipt has frozen seriesKey, formattedReceiptNumber with unique school-scoped constraint; student identifier history continues current immutable technical FK. Index lookup for formatted numbers and history.

**Concrete domain model:** Add SchoolNumberingPolicy with entityType RECEIPT|STUDENT_ID, seriesMode CONTINUOUS|ACADEMIC_YEAR|FINANCIAL_YEAR, width/prefixPattern/effectiveFrom/version; NumberSequence unique school/type/seriesKey with atomically locked lastValue.

**DB release sequence:** EXPAND nullable/new schema and composite school foreign keys; preserve `Student.id`, existing enrollment/payment/TC/file IDs; verify old code compatibility in isolated two-school fixture; deterministic historic backfill with approved verified mapping; compare before/after counts, affected monetary totals, file checksums. Apply partial unique index and date overlap constraints in reviewed Prisma+SQL migration. If already posted payments or issued certificates exist, use audited forward correction—not deleting finance tables or rolling back student identities.

## 3. DLD — API and public facade contracts

**Existing requirement HTTP design:** GET/PATCH /platform/schools/:id/numbering-policies (platform owner or delegated school admin by approved role) {entityType,seriesRule,prefixPattern,width,version}; GET /operator/fees/numbering-preview?sessionId; student ID suggestion returns advisory only, allocator reserves during student create transaction.

**Typed API requirements:** Request JSON uses school-scoped IDs, ISO business DATE and version/idempotency; for manager actions enforce OperatorGuard + capability + CsrfGuard, for Platform Admin guard separately, for downloads enforce current school/signed-file authorization. 401 unauth, 403 forbidden, 404 foreign object, 409 stale/concurrent/illegal transition, 422 invalid date/class, 503 job/outbox unavailable. Old URLs/requests continue through compatibility adapters and are tested. Public domain facade owns reads/mutations; orchestrator coordinates via opaque port (no cross-owner Prisma table writes).

## 4. DLD — Implementation sequence and UI screens

1. Backfill old ReceiptSequence and StudentIdSequence counters into CONTINUOUS policy with next allocated number above all existing numbers. Printed numbers including prefix unique school-wide; preserve prior-issued values exactly.
2. For receipt allocate inside payment transaction, for student code inside admission transaction; compute academic-year key via validated AcadSession and fiscal year via Asia/Kolkata date (April–March). If prefix reset produces duplicate, fail 409 at setup/allocator rather than reusing.
3. UI admin numbering settings gives two independent previews with example dates and warnings; cannot edit an active historical series retroactively; role and school scoping enforced.
4. 100 concurrent receipts and student IDs across March/April and year transition result in zero collisions; old receipt/TC/student print references remain unchanged.

**Additional service behavior in original scope:** Sequence service obtains per-school+entity+series FOR UPDATE, computes seriesKey from selected session or Asia/Kolkata financial year, applies validated template then commits with payment/student transaction and audit. Web setup shows example 2026 vs 2027 outputs and warns that existing historical identifiers do not change. Legacy ReceiptSequence and StudentIdSequence migrated to CONTINUOUS policy with seeded lastValue, avoiding reissue.

**Failure and retry behavior:** If session year and financial year overlap, explicit policy wins. Multiple schools can share formatted receipt number only because school tenant scope differentiates them; in-school duplicate forbidden. Prefix edits cannot collide with old numbers; validate uniqueness on change.

**UI state matrix:** loading, empty, ready, editing/review, submitting, PREPARED/QUEUED/CLOSING where appropriate, success, stale conflict, retryable failure, archived/read-only. Show accurate school/year/class and correct current vs historic context. No misleading 'completed' status while async steps still running. Validate at 360px/768px/1366px; accessible labels/keyboard and permission-correct navigation. Any redesigned layout must allow previous workflows.

## 5. FE/BE/NFR test plan (execute, do not just list)

**FE:** TASK-027-FE01 happy path; TASK-027-FE02 error; TASK-027-FE03 old UI preserved.

**BE unit/API/SQL + authorization:** TASK-027-BE01 API; TASK-027-BE02 school isolation; TASK-027-BE03 idempotency.

**NFR performance/worker/privacy:** TASK-027-NFR01 p95 performance; TASK-027-NFR02 recovery; TASK-027-NFR03 security.

**High-risk task-specific hard assertions:** 100 concurrent receipts and student IDs across March/April and year transition result in zero collisions; old receipt/TC/student print references remain unchanged. For async tasks kill the worker after each step, resume without duplicates. For academic transitions verify old ledger origin/snapshot and no phantom active enrollment. For files verify old PDF SHA and signed URL expiration. For numbering verify concurrency uniqueness. Test invalid/stale versions and cross-school IDOR with real PostgreSQL transactions.

**Required existing-product regression:** BASE-06,10,11,14 (see [REGRESSION-BASELINE](../REGRESSION-BASELINE.md)). Capture BEFORE/AFTER screen recordings or screenshots and matching API/DB outputs.

## 6. Definition of Done and safe implementation gate

The task works **alone plus listed earlier prerequisites**; no later CTA/API is needed. UI, backend and NFR evidence has been executed, not inferred from Jest mocks. Database migration is rehearsed without destructive resets and approved rollback/roll-forward plan. Original login, admission, class changes, monthly fees, collections/void, reports, transport and platform TC remain functional as applicable. Reviewer must sign off P0 changes, and only then update the **one tracker** with PR, test results, baselines, review and eventual DONE after approved merge.

## 8. Additional exact acceptance and regression test matrix

Use the synthetic two-school fixtures and original-function BASE-XX journeys. Record **actual** browser/API/DB/NFR results, not planned/assumed PASS. These are separate from the earlier FE/BE/NFR scenarios:

| Test ID | Preconditions/action → required assertion |
|---|---|
| TASK-027-FE04 | Preview continuous, academic-year and financial-year receipt/SR series across March/April. |
| TASK-027-FE05 | Change policy after old printed receipt and verify number stays exactly unchanged. |
| TASK-027-BE04 | Existing ReceiptSequence/StudentIdSequence behavior migrated with next number intact. |
| TASK-027-BE05 | Run 100 parallel receipt allocations without collision or skipped duplicate reissue. |
| TASK-027-BE06 | Unsafe duplicate prefix/foreign-school settings rejected before mutation. |
| TASK-027-NFR04 | Sequence lock contention p95 and DB deadlock retries measured. |
| TASK-027-NFR05 | Crash after number reservation does not issue double receipt upon same request replay. |

Every failed protected BASE flow is a regression regardless of whether the new feature passes. For commercial Admit Card tasks, test execution itself remains blocked before signed CR approval.
