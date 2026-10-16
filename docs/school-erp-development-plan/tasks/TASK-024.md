# TASK-024 — Bulk promotion, repeat and graduation transitions

**Owning module:** Students / Academics · **Prerequisite IDs:** TASK-008, TASK-009, TASK-022 · **Policy/spec gate:** SPEC_SYNC_REQUIRED · **Reviewer risk:** **HIGH** · **Status:** only in [TASK-TRACKER.md](../TASK-TRACKER.md).

## 1. What the user receives (not just a backend change)
**Operator/school story:** As a manager, I review all students at year-end, promote some, repeat some, graduate others, and explicitly handle transfers without creating duplicate students.

**Existing requirement acceptance:** UC1: stage 30 Class 1 students to Class 2, 2 repeat Class 1, 1 passes out. UC2: operator stages a section-only change for next year without touching current ACTIVE enrollment. UC3: operator retries failed bulk staging after connection loss. UC4: duplicate same-student decisions in a staging batch rejected. UC5: records are audited for individual correction without undoing fee receipts.

**Business policies and scope limit:** Preview/promote/repeat/graduate/leave end-of-year student batches with exceptions, destination classes, durable idempotent job progress and audit. No code should invoke any higher-numbered unfinished task; where future work is expected, expose only a tested extension point now.

**Golden demonstration:** 500 students including repeats and pass-outs: after preparing batch current year class, fees, transport and enrollment records remain unchanged; another operator sees prepared results and conflicts.

## 2. DLD — Domain schema and migration

**Existing source to inspect:** `apps/api/src/modules/students/application/search-students.service.ts`<br>`apps/api/src/modules/platform-admin/academics/academics.service.ts`<br>`prisma/schema.prisma`

**Proposed persisted records and invariants:** SessionTransitionBatch(id,schoolId,sourceSessionId,targetSessionId,operatorId,idempotencyKey,requestHash,state,summary,createdAt,committedAt); SessionTransitionItem(batchId,studentId,decision,targetClassId,targetSectionId,version,status,errorCode). UNIQUE(schoolId,idempotencyKey), UNIQUE(batchId,studentId); bounded processing with replay markers.

**Concrete domain model:** SessionTransitionBatch and Items with source/target session, student, source enrollmentVersion, target class/section, decision PROMOTE|REPEAT|PASS_OUT|LEAVE, status DRAFT|PREPARED|CONFLICT, content hash and unique idempotency. Target session can be DRAFT.

**DB release sequence:** EXPAND nullable/new schema and composite school foreign keys; preserve `Student.id`, existing enrollment/payment/TC/file IDs; verify old code compatibility in isolated two-school fixture; deterministic historic backfill with approved verified mapping; compare before/after counts, affected monetary totals, file checksums. Apply partial unique index and date overlap constraints in reviewed Prisma+SQL migration. If already posted payments or issued certificates exist, use audited forward correction—not deleting finance tables or rolling back student identities.

## 3. DLD — API and public facade contracts

**Existing requirement HTTP design:** GET /operator/academic-sessions/:id/promotion-candidates?targetSessionId, POST .../promotion-preview {items}, POST .../promotion-commit {reviewToken,idempotencyKey}, GET .../promotion-batches/:batchId. Typed 409 stale enrollment, conflict, closed target; 422 invalid destination; 404 cross school.

**Typed API requirements:** Request JSON uses school-scoped IDs, ISO business DATE and version/idempotency; for manager actions enforce OperatorGuard + capability + CsrfGuard, for Platform Admin guard separately, for downloads enforce current school/signed-file authorization. 401 unauth, 403 forbidden, 404 foreign object, 409 stale/concurrent/illegal transition, 422 invalid date/class, 503 job/outbox unavailable. Old URLs/requests continue through compatibility adapters and are tested. Public domain facade owns reads/mutations; orchestrator coordinates via opaque port (no cross-owner Prisma table writes).

## 4. DLD — Implementation sequence and UI screens

1. Collect eligible candidates from Students facade and validate school/current source and destination class/section. Promotion PREVIEW must clearly label that NO student will move yet.
2. Commit/preparation endpoint **only writes PREPARED decision journal**, never ends an ACTIVE source enrollment or activates target year. A repeated key returns original batch, changed payload returns 409; version conflict revalidation flags student rows.
3. Web page allows per-student decision, class/section target, bulk fill, previews conflict counts, Save Preparation, view/replace reviewed batch and export draft. Button must not say 'Promote Now' if actual rollover unavailable.
4. 500 students including repeats and pass-outs: after preparing batch current year class, fees, transport and enrollment records remain unchanged; another operator sees prepared results and conflicts.

**Additional service behavior in original scope:** Preview fetches student snapshots by facade, checks section, school, status, target session. Stage revalidates versions and produces immutable PREPARED decision records; do not end source enrollment or activate target enrollment. For pass-out store outcome intent and verify the existing ExitPublicFacade via earlier TASK-022. Explicit year closure/finalization is out of scope of this task. Batch engine persists per-row PREPARED decisions and exposes retry of failed staging only. The source ACTIVE enrollment stays untouched during this task; the target academic year may remain DRAFT, and no ACTIVE target enrollment is created by preparation. TASK-025 later consumes staged decisions and finalizes them at close/rollover. UI editable grid with explicit actions, count summary and 'Review and confirm' flow.

**Failure and retry behavior:** Fees and transport follow their OWN eligibility rules; promotion never copies debts as new charges. Promote of CLOSED source requires authorized close process sequencing. Handle previous-year student with unpaid balance but still promoting; client decision determines warning vs block.

**UI state matrix:** loading, empty, ready, editing/review, submitting, PREPARED/QUEUED/CLOSING where appropriate, success, stale conflict, retryable failure, archived/read-only. Show accurate school/year/class and correct current vs historic context. No misleading 'completed' status while async steps still running. Validate at 360px/768px/1366px; accessible labels/keyboard and permission-correct navigation. Any redesigned layout must allow previous workflows.

## 5. FE/BE/NFR test plan (execute, do not just list)

**FE:** TASK-024-FE01 happy path; TASK-024-FE02 error; TASK-024-FE03 old UI preserved.

**BE unit/API/SQL + authorization:** TASK-024-BE01 API; TASK-024-BE02 school isolation; TASK-024-BE03 idempotency.

**NFR performance/worker/privacy:** TASK-024-NFR01 p95 performance; TASK-024-NFR02 recovery; TASK-024-NFR03 security.

**High-risk task-specific hard assertions:** 500 students including repeats and pass-outs: after preparing batch current year class, fees, transport and enrollment records remain unchanged; another operator sees prepared results and conflicts. For async tasks kill the worker after each step, resume without duplicates. For academic transitions verify old ledger origin/snapshot and no phantom active enrollment. For files verify old PDF SHA and signed URL expiration. For numbering verify concurrency uniqueness. Test invalid/stale versions and cross-school IDOR with real PostgreSQL transactions.

**Required existing-product regression:** BASE-03,06,07,09,12 (see [REGRESSION-BASELINE](../REGRESSION-BASELINE.md)). Capture BEFORE/AFTER screen recordings or screenshots and matching API/DB outputs.

## 6. Definition of Done and safe implementation gate

The task works **alone plus listed earlier prerequisites**; no later CTA/API is needed. UI, backend and NFR evidence has been executed, not inferred from Jest mocks. Database migration is rehearsed without destructive resets and approved rollback/roll-forward plan. Original login, admission, class changes, monthly fees, collections/void, reports, transport and platform TC remain functional as applicable. Reviewer must sign off P0 changes, and only then update the **one tracker** with PR, test results, baselines, review and eventual DONE after approved merge.

## 8. Additional exact acceptance and regression test matrix

Use the synthetic two-school fixtures and original-function BASE-XX journeys. Record **actual** browser/API/DB/NFR results, not planned/assumed PASS. These are separate from the earlier FE/BE/NFR scenarios:

| Test ID | Preconditions/action → required assertion |
|---|---|
| TASK-024-FE04 | Stage bulk promotion 30 pupils, 2 repeats, 1 pass-out; show PREPARED summary with no current-year mutation. |
| TASK-024-FE05 | Stale class/section mapping flagged per row; source enrollment remains ACTIVE. |
| TASK-024-BE04 | Old student directory/profile current year unchanged while stage batch exists. |
| TASK-024-BE05 | Two managers stage conflicting decisions: version/hash conflict and no duplicate decisions. |
| TASK-024-BE06 | Wrong-school target section rejected; duplicate student row blocked. |
| TASK-024-NFR04 | 500–5k decisions preview/staging bounded memory, latency measured. |
| TASK-024-NFR05 | Queue resume after failure preserves unchanged current enrollments and PREPARED only. |

Every failed protected BASE flow is a regression regardless of whether the new feature passes. For commercial Admit Card tasks, test execution itself remains blocked before signed CR approval.
