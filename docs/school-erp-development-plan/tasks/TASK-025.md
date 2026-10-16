# TASK-025 — Academic-year close, archive and correction controls

**Owning module:** Academics · **Prerequisite IDs:** TASK-021, TASK-024 · **Policy/spec gate:** POLICY_CONFIRMATION · **Reviewer risk:** **CRITICAL** · **Status:** only in [TASK-TRACKER.md](../TASK-TRACKER.md).

## 1. What the user receives (not just a backend change)
**Operator/school story:** As a school manager, I formally close the completed academic year after reviewing enrollments, transfers and outstanding finance, and can still access its frozen records without ordinary edits.

**Existing requirement acceptance:** UC1: 2026–27 with all reviewed student transitions closes once, while old ₹450 outstanding remains collectable. UC2: when a promotion batch failed, closing preview flags affected students; approval/policy dictates block vs signed warning. UC3: after close, old enrollment modification returns 409/403. UC4: concurrent operators attempt close twice, exactly one applied. UC5: an authorized correction creates audited compensating event and is not in-place mutation.

**Business policies and scope limit:** Only documented DRAFT→ACTIVE→CLOSING→CLOSED transitions, never auto-close because of current date. No future fee deletion, no automatic overdue payment writing, and no unreviewed promotion. Client must approve blockers versus warnings, target activation ordering, partial-batch repair and exceptional correction scope. Never leave a student enrolled ACTIVE simultaneously in old and future school year. No code should invoke any higher-numbered unfinished task; where future work is expected, expose only a tested extension point now.

**Golden demonstration:** Kill worker after 17/20 chunks; restart resumes without duplicate student year rows/charges, old-year unpaid fees remain collectable after new-year activation, any failed student prevents final switch.

## 2. DLD — Domain schema and migration

**Existing source to inspect:** `apps/api/src/modules/platform-admin/academics/academics.service.ts`<br>`apps/api/src/modules/fees/facade/fees-public.facade.ts`<br>`prisma/schema.prisma`

**Proposed persisted records and invariants:** AcademicSession.status/version/closedAt/closedBy and SessionClosureReview(schoolId,sessionId,version,reviewToken,counts/ledgerHash,reviewedBy,createdAt); row-level lock on session+school; sessionId school scoped. Persist transition journal and restart cursor per chunk; preserve historical enrollment and financial source records. Optional correction event append-only, not unlocking historic reports.

**Concrete domain model:** Use AcademicSession state DRAFT/ACTIVE/CLOSING/CLOSED, school-scoped YearTransitionJournal, idempotent per-student prepared decision state. Enforce school unique ACTIVE/CLOSING via reviewed partial index; historical enrollment rows immutable.

**DB release sequence:** EXPAND nullable/new schema and composite school foreign keys; preserve `Student.id`, existing enrollment/payment/TC/file IDs; verify old code compatibility in isolated two-school fixture; deterministic historic backfill with approved verified mapping; compare before/after counts, affected monetary totals, file checksums. Apply partial unique index and date overlap constraints in reviewed Prisma+SQL migration. If already posted payments or issued certificates exist, use audited forward correction—not deleting finance tables or rolling back student identities.

## 3. DLD — API and public facade contracts

**Existing requirement HTTP design:** GET /operator/academic-sessions/:id/close-preview returns reviewed/unreviewed enrollment count, pending promotions, outstanding charges, readiness and reviewToken. POST /operator/academic-sessions/:id/close {expectedVersion,reviewToken,targetSessionId?,confirmWarnings,idempotencyKey} manager+CSRF. GET closed years from TASK-007 unaffected. Typed 409 stale preview/blocked state, 422 bad transition, 404 other school.

**Typed API requirements:** Request JSON uses school-scoped IDs, ISO business DATE and version/idempotency; for manager actions enforce OperatorGuard + capability + CsrfGuard, for Platform Admin guard separately, for downloads enforce current school/signed-file authorization. 401 unauth, 403 forbidden, 404 foreign object, 409 stale/concurrent/illegal transition, 422 invalid date/class, 503 job/outbox unavailable. Old URLs/requests continue through compatibility adapters and are tested. Public domain facade owns reads/mutations; orchestrator coordinates via opaque port (no cross-owner Prisma table writes).

## 4. DLD — Implementation sequence and UI screens

1. Close-preview obtains batch PREPARED counts, missing/invalid decisions, finance as-of snapshot from Fees facade and transport dependencies. Approval of blockers/warnings and promotion timing required before acceptance.
2. Under school transition lock set CLOSING; process bounded chunks with idempotent commands: end source enrollment, create target session enrollment with correct class/section, apply pass-out via previous Exit facade, record journal. Normal reads remain pinned to old context (or reviewed maintenance read-only mode) until all required rows complete.
3. After all confirmed, one guarded final switch marks old session CLOSED and target ACTIVE, audits snapshot and publishes cache invalidation. On crash resume journal and reject competing activation, never two visible active years.
4. Kill worker after 17/20 chunks; restart resumes without duplicate student year rows/charges, old-year unpaid fees remain collectable after new-year activation, any failed student prevents final switch.

**Additional service behavior in original scope:** Academics service calls StudentsPublicFacade for PREPARED transition decision state and FeesPublicFacade for versioned as-of closure financial snapshot; requires no future Report service. Under a locked school transition coordinator, validate all staged decisions from TASK-024; execute bounded idempotent student-transaction batches (END source and ACTIVATE/CREATE target according to approved window), persist progress/exception journal, and only mark the source CLOSED / target ACTIVE when all blocking items are completed. Use a durable transition state that survives crashes and prevents other activation until finalization. New UI 'Close Year' readiness wizard has summary, blockers, warning checkboxes, confirmation and irreversible-effect explanation; closed year read-only banner.

**Failure and retry behavior:** If a new old-year payment is collected after closing, do not change historical closure snapshot, only current outstanding ledger. Correct close after issue requires append-only amendment with role and reason; do not silently reopen or mass mutate prior-year rows. Close is idempotent by token.

**UI state matrix:** loading, empty, ready, editing/review, submitting, PREPARED/QUEUED/CLOSING where appropriate, success, stale conflict, retryable failure, archived/read-only. Show accurate school/year/class and correct current vs historic context. No misleading 'completed' status while async steps still running. Validate at 360px/768px/1366px; accessible labels/keyboard and permission-correct navigation. Any redesigned layout must allow previous workflows.

## 5. FE/BE/NFR test plan (execute, do not just list)

**FE:** TASK-025-FE01 happy path; TASK-025-FE02 error; TASK-025-FE03 old UI preserved.

**BE unit/API/SQL + authorization:** TASK-025-BE01 API; TASK-025-BE02 school isolation; TASK-025-BE03 idempotency.

**NFR performance/worker/privacy:** TASK-025-NFR01 p95 performance; TASK-025-NFR02 recovery; TASK-025-NFR03 security.

**High-risk task-specific hard assertions:** Kill worker after 17/20 chunks; restart resumes without duplicate student year rows/charges, old-year unpaid fees remain collectable after new-year activation, any failed student prevents final switch. For async tasks kill the worker after each step, resume without duplicates. For academic transitions verify old ledger origin/snapshot and no phantom active enrollment. For files verify old PDF SHA and signed URL expiration. For numbering verify concurrency uniqueness. Test invalid/stale versions and cross-school IDOR with real PostgreSQL transactions.

**Required existing-product regression:** BASE-03,05,06,07,09,12,14 (see [REGRESSION-BASELINE](../REGRESSION-BASELINE.md)). Capture BEFORE/AFTER screen recordings or screenshots and matching API/DB outputs.

## 6. Definition of Done and safe implementation gate

The task works **alone plus listed earlier prerequisites**; no later CTA/API is needed. UI, backend and NFR evidence has been executed, not inferred from Jest mocks. Database migration is rehearsed without destructive resets and approved rollback/roll-forward plan. Original login, admission, class changes, monthly fees, collections/void, reports, transport and platform TC remain functional as applicable. Reviewer must sign off P0 changes, and only then update the **one tracker** with PR, test results, baselines, review and eventual DONE after approved merge.


## Rollover finalization DB atomicity caveat

A whole-school 5,000-student promotion cannot safely fit a single long transaction while the application continues normal school writes. Use durable SchoolTransition lock/status and **idempotent chunk journal** for per-student pair of (end old enrollment + create new target enrollment). *Regular consumers must not treat partial new target rows as ACTIVE school enrollment until the final switch is complete.* Use `AcademicSession.status=CLOSING`, school-level write gate and read projection pinned to source session, or an approved maintenance read-only period, together with reliable worker restart recovery. The final old CLOSED / target ACTIVE switch is **one short transaction**, not two uncoordinated POSTs. Verify progress after killed workers and legacy client requests attempting writes during CLOSING.

Financial responsibility: do not regenerate last-year charges during rollover; any new-year charges are generated only when validated new-year eligibility becomes active, using sourceKey uniqueness. Old balances stay against origin session and old receipts immutable.

## 8. Additional exact acceptance and regression test matrix

Use the synthetic two-school fixtures and original-function BASE-XX journeys. Record **actual** browser/API/DB/NFR results, not planned/assumed PASS. These are separate from the earlier FE/BE/NFR scenarios:

| Test ID | Preconditions/action → required assertion |
|---|---|
| TASK-025-FE04 | Close year and finalize PREPARED batch, next year active, old year closed; old debt still collectable. |
| TASK-025-FE05 | Pending/conflicted student in staging blocks close; review shows reason and retry. |
| TASK-025-BE04 | Previous year receipt/TC/history unchanged and old read-only works. |
| TASK-025-BE05 | Kill after chunk 17/20, resume journal: exactly one target enrollment/student. |
| TASK-025-BE06 | Concurrent close/activate prevents two ACTIVE or CLOSING years. |
| TASK-025-NFR04 | 5k promotions processed bounded chunks and measured queue memory. |
| TASK-025-NFR05 | Old/new year switch coherent to API reads; no partially visible target current class. |

Every failed protected BASE flow is a regression regardless of whether the new feature passes. For commercial Admit Card tasks, test execution itself remains blocked before signed CR approval.
