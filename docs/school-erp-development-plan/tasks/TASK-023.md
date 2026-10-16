# TASK-023 — Returning student re-admission into current year

**Owning module:** Students · **Prerequisite IDs:** TASK-022 · **Policy/spec gate:** POLICY_CONFIRMATION · **Reviewer risk:** **HIGH** · **Status:** only in [TASK-TRACKER.md](../TASK-TRACKER.md).

## 1. What the user receives (not just a backend change)
**Operator/school story:** As school manager, I readmit a student who previously left without losing old student identity, classes, TC, fee or transport history.

**Existing requirement acceptance:** UC1: child left in 2026-27, returns in 2027-28 to Class 3-B. UC2: return in same session after temporary inactive state, requires explicit effective dates. UC3: old debts remain visible and admission charges behave per one-time policy. UC4: tries to reactivate student currently enrolled in another active class -> conflict. UC5: returning student chooses transport anew, not silently reactivate old route.

**Business policies and scope limit:** Status ACTIVE toggle alone is insufficient: must specify target session, class, section, reentry date and reason. Do not generate duplicate Student UUID/code; no default re-use of old class or transport assignment. Enforce new-year closure/eligibility and fees start rule CL-02. No code should invoke any higher-numbered unfinished task; where future work is expected, expose only a tested extension point now.

**Golden demonstration:** Former 2026-27 student returns 2027-28 to different class with same ID; old TC/dues remain, no duplicate admission fee unless school policy authorizes it.

## 2. DLD — Domain schema and migration

**Existing source to inspect:** `apps/api/src/modules/students/application/change-student-status.service.ts`<br>`apps/api/src/modules/students/application/admit-student.service.ts`<br>`prisma/schema.prisma`

**Proposed persisted records and invariants:** StudentReAdmission(id,schoolId,studentId,targetSessionId,effectiveDate,reason,createdBy,previousExitId?,status,version); new StudentEnrollment with target period and preserved prior rows. If repeated in same target year, enforce no date overlap (SQL unique/constraint or explicit lock + composite business key).

**Concrete domain model:** Add StudentReAdmission event with same Student UUID, target AcademicSession, class/section, effective date, original exit ref, actor and idempotency request key; validate no overlapping enrollment date segments.

**DB release sequence:** EXPAND nullable/new schema and composite school foreign keys; preserve `Student.id`, existing enrollment/payment/TC/file IDs; verify old code compatibility in isolated two-school fixture; deterministic historic backfill with approved verified mapping; compare before/after counts, affected monetary totals, file checksums. Apply partial unique index and date overlap constraints in reviewed Prisma+SQL migration. If already posted payments or issued certificates exist, use audited forward correction—not deleting finance tables or rolling back student identities.

## 3. DLD — API and public facade contracts

**Existing requirement HTTP design:** GET /operator/students/:id/reactivation-preview?targetSessionId; POST /operator/students/:id/reactivate {targetSessionId,classId,sectionId,effectiveDate,reason,requestKey,expectedStudentVersion}; GET /operator/students/:id/enrollment-history.

**Typed API requirements:** Request JSON uses school-scoped IDs, ISO business DATE and version/idempotency; for manager actions enforce OperatorGuard + capability + CsrfGuard, for Platform Admin guard separately, for downloads enforce current school/signed-file authorization. 401 unauth, 403 forbidden, 404 foreign object, 409 stale/concurrent/illegal transition, 422 invalid date/class, 503 job/outbox unavailable. Old URLs/requests continue through compatibility adapters and are tested. Public domain facade owns reads/mutations; orchestrator coordinates via opaque port (no cross-owner Prisma table writes).

## 4. DLD — Implementation sequence and UI screens

1. Preview retrieves latest exit and historical year classes/fees. Reject already ACTIVE student or closed/foreign target session and mismatched section; no naive status ACTIVE toggle.
2. Transactionally append re-admission event + new dated enrollment via Students facade. Publish new fee eligibility with explicit start date, optionally create new transport service only upon new selection; maintain previous TC identity and arrears.
3. UI Reactivate action available only for eligible exited records; guided target year/class/section/date, previous class and outstanding fee summary, review and confirm.
4. Former 2026-27 student returns 2027-28 to different class with same ID; old TC/dues remain, no duplicate admission fee unless school policy authorizes it.

**Additional service behavior in original scope:** Students service fetches existing identity, validates inactive/left and target session ACTIVE via AcademicsPublicFacade, loads class/section and eligibility, locks existing enrollments, creates new enrollment and records re-admission event; fee start event passed to FeesPublicFacade and optional new transport assignment staged through transport owner. UI 'Reactivate Student' multi-step chooses year/class/section, displays previous status and debts, requires confirmation.

**Failure and retry behavior:** Prior TC still authentic historic issue; new TC may be issued after return per policy. Paid previous registration/admission fees should not repeat unless client explicitly approves re-enrollment policy. Race of two reactivate clicks must create one result.

**UI state matrix:** loading, empty, ready, editing/review, submitting, PREPARED/QUEUED/CLOSING where appropriate, success, stale conflict, retryable failure, archived/read-only. Show accurate school/year/class and correct current vs historic context. No misleading 'completed' status while async steps still running. Validate at 360px/768px/1366px; accessible labels/keyboard and permission-correct navigation. Any redesigned layout must allow previous workflows.

## 5. FE/BE/NFR test plan (execute, do not just list)

**FE:** TASK-023-FE01 happy path; TASK-023-FE02 error; TASK-023-FE03 old UI preserved.

**BE unit/API/SQL + authorization:** TASK-023-BE01 API; TASK-023-BE02 school isolation; TASK-023-BE03 idempotency.

**NFR performance/worker/privacy:** TASK-023-NFR01 p95 performance; TASK-023-NFR02 recovery; TASK-023-NFR03 security.

**High-risk task-specific hard assertions:** Former 2026-27 student returns 2027-28 to different class with same ID; old TC/dues remain, no duplicate admission fee unless school policy authorizes it. For async tasks kill the worker after each step, resume without duplicates. For academic transitions verify old ledger origin/snapshot and no phantom active enrollment. For files verify old PDF SHA and signed URL expiration. For numbering verify concurrency uniqueness. Test invalid/stale versions and cross-school IDOR with real PostgreSQL transactions.

**Required existing-product regression:** BASE-06,07,09,10,11,13,14 (see [REGRESSION-BASELINE](../REGRESSION-BASELINE.md)). Capture BEFORE/AFTER screen recordings or screenshots and matching API/DB outputs.

## 6. Definition of Done and safe implementation gate

The task works **alone plus listed earlier prerequisites**; no later CTA/API is needed. UI, backend and NFR evidence has been executed, not inferred from Jest mocks. Database migration is rehearsed without destructive resets and approved rollback/roll-forward plan. Original login, admission, class changes, monthly fees, collections/void, reports, transport and platform TC remain functional as applicable. Reviewer must sign off P0 changes, and only then update the **one tracker** with PR, test results, baselines, review and eventual DONE after approved merge.
