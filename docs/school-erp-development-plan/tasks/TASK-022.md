# TASK-022 — Leaving, pass-out and effective service termination

**Owning module:** Students / Transport / Fees · **Prerequisite IDs:** TASK-009, TASK-014 · **Policy/spec gate:** SPEC_SYNC_REQUIRED · **Reviewer risk:** **HIGH** · **Status:** only in [TASK-TRACKER.md](../TASK-TRACKER.md).

## 1. What the user receives (not just a backend change)
**Operator/school story:** As a school manager, I record when a student leaves or passes out, with an effective date, so current roster and future service charges stop while historical dues and documents remain intact.

**Existing requirement acceptance:** UC1: leave without TC effective 2027-02-15, March fees/transport stop; UC2: pass-out preserves historic class and outstanding; UC3: transfer with an already-issued TC can link it without generating one; UC4: terminate service with recoverable failed step; UC5: old dues collectable under existing Fees facade.

**Business policies and scope limit:** Provide explicit LEAVE/TRANSFER/PASS_OUT workflow with effective date, end current enrollment, stop new fees and transport via owned public commands, retaining historical debt and issued TC records. No code should invoke any higher-numbered unfinished task; where future work is expected, expose only a tested extension point now.

**Golden demonstration:** Failure injection: after Transport stop but before Fees acknowledgement worker dies; resume exactly once and never leave orphan current enrollment or generate Dec fee after Nov exit.

## 2. DLD — Domain schema and migration

**Existing source to inspect:** `apps/api/src/modules/students/application/change-student-status.service.ts`<br>`apps/api/src/modules/transports/application/end-transport.service.ts`<br>`apps/api/src/modules/fees/application/generate-dues.service.ts`

**Proposed persisted records and invariants:** Add StudentExitEvent(id,schoolId,studentId,sessionId,effectiveDate,reason,exitType LEFT|TRANSFERRED|PASSED_OUT,tcId?,state PENDING|APPLIED|FAILED,createdBy,version) and durable workflow state/outbox; record StudentEnrollment.endedReason,endedAt effective; transport's serviceEndDate updated by its owner; fee accrual stop policy stored as domain eligibility event, no direct fee table update by Students.

**Concrete domain model:** Persist StudentExitEvent and ExitWorkflow with type LEFT|TRANSFERRED|PASSED_OUT, school/student/session, effective date, reason, step states, unique idempotencyKey, audit. Existing Student.status and enrollment are updated only by Students owner.

**DB release sequence:** EXPAND nullable/new schema and composite school foreign keys; preserve `Student.id`, existing enrollment/payment/TC/file IDs; verify old code compatibility in isolated two-school fixture; deterministic historic backfill with approved verified mapping; compare before/after counts, affected monetary totals, file checksums. Apply partial unique index and date overlap constraints in reviewed Prisma+SQL migration. If already posted payments or issued certificates exist, use audited forward correction—not deleting finance tables or rolling back student identities.

## 3. DLD — API and public facade contracts

**Existing requirement HTTP design:** POST /operator/students/:id/exit/preview {effectiveDate,reason,type,issueTc?:boolean}; POST /operator/students/:id/exit {reviewToken,idempotencyKey}; GET /operator/students/:id/exit-history. Optional 'Issue TC' invokes DC-01/02 via document facade only after clearance and policy; returns 409 when blocked.

**Typed API requirements:** Request JSON uses school-scoped IDs, ISO business DATE and version/idempotency; for manager actions enforce OperatorGuard + capability + CsrfGuard, for Platform Admin guard separately, for downloads enforce current school/signed-file authorization. 401 unauth, 403 forbidden, 404 foreign object, 409 stale/concurrent/illegal transition, 422 invalid date/class, 503 job/outbox unavailable. Old URLs/requests continue through compatibility adapters and are tested. Public domain facade owns reads/mutations; orchestrator coordinates via opaque port (no cross-owner Prisma table writes).

## 4. DLD — Implementation sequence and UI screens

1. Preview validates a current enrollment and service dates via Students + Transport facade and future fee accrual via Fees facade; no new TC is issued or required for this task. Student may leave without TC per approved policy.
2. Begin exit: start an idempotent workflow. Terminate dated Transport assignment and stop Fees future accrual using owned commands; preserve earlier assessed debts; after all required steps succeed end current enrollment and mark exit applied. Use outbox or bounded saga with safe replay.
3. UI Student Profile > Leave/Pass-out/Transfer, choose effective date and reason, show transport stopping, previously due fees and confirmation. History lists exit event and recovery state with no 'Generate TC' dead button.
4. Failure injection: after Transport stop but before Fees acknowledgement worker dies; resume exactly once and never leave orphan current enrollment or generate Dec fee after Nov exit.

**Additional service behavior in original scope:** Explicit coordinator owned by student lifecycle (not TC controller) requests preview from transport and fees facades, validates year, effective date, remaining debts for display (no new TC issuance or clearance call), persists ExitWorkflow, calls individually idempotent domain commands via outbox; finalize student only after future billing/transport closure acknowledged; errors visible as retryable, no cross-module repo writes. UI guided review shows stopping future services and retaining unpaid balances.

**Failure and retry behavior:** Partial month if student leaves mid-month unresolved (CL-02). TC issued to alumnus does not imply an unapproved status transition. Older existing TC unaffected. Avoid deadlocks via stable per-student lock order and outbox if multi-service commit can't be atomic.

**UI state matrix:** loading, empty, ready, editing/review, submitting, PREPARED/QUEUED/CLOSING where appropriate, success, stale conflict, retryable failure, archived/read-only. Show accurate school/year/class and correct current vs historic context. No misleading 'completed' status while async steps still running. Validate at 360px/768px/1366px; accessible labels/keyboard and permission-correct navigation. Any redesigned layout must allow previous workflows.

## 5. FE/BE/NFR test plan (execute, do not just list)

**FE:** TASK-022-FE01 happy path; TASK-022-FE02 error; TASK-022-FE03 old UI preserved.

**BE unit/API/SQL + authorization:** TASK-022-BE01 API; TASK-022-BE02 school isolation; TASK-022-BE03 idempotency.

**NFR performance/worker/privacy:** TASK-022-NFR01 p95 performance; TASK-022-NFR02 recovery; TASK-022-NFR03 security.

**High-risk task-specific hard assertions:** Failure injection: after Transport stop but before Fees acknowledgement worker dies; resume exactly once and never leave orphan current enrollment or generate Dec fee after Nov exit. For async tasks kill the worker after each step, resume without duplicates. For academic transitions verify old ledger origin/snapshot and no phantom active enrollment. For files verify old PDF SHA and signed URL expiration. For numbering verify concurrency uniqueness. Test invalid/stale versions and cross-school IDOR with real PostgreSQL transactions.

**Required existing-product regression:** BASE-06,07,09,10,11,13,14 (see [REGRESSION-BASELINE](../REGRESSION-BASELINE.md)). Capture BEFORE/AFTER screen recordings or screenshots and matching API/DB outputs.

## 6. Definition of Done and safe implementation gate

The task works **alone plus listed earlier prerequisites**; no later CTA/API is needed. UI, backend and NFR evidence has been executed, not inferred from Jest mocks. Database migration is rehearsed without destructive resets and approved rollback/roll-forward plan. Original login, admission, class changes, monthly fees, collections/void, reports, transport and platform TC remain functional as applicable. Reviewer must sign off P0 changes, and only then update the **one tracker** with PR, test results, baselines, review and eventual DONE after approved merge.
