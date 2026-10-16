# TASK-024 — Bulk promotion, repeat and graduation transitions

**Engineering owner:** Students / Academics. **Only technical predecessors:** TASK-008, TASK-009, TASK-022 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Preview/promote/repeat/graduate/leave end-of-year student batches with exceptions, destination classes, durable idempotent job progress and audit.

**Explicitly out of this task:** Do not require year close TASK-025; this task prepares/processes reviewed transitions while target year may be DRAFT/eligible under explicitly approved staging policy. Actual final close controls ship separately.

**Operator/user story:** As a manager, I review all students at year-end, promote some, repeat some, graduate others, and explicitly handle transfers without creating duplicate students.

**Use cases with success/error expectations:** UC1: 30 Class 1 students move to Class 2, 2 repeat Class 1, 1 passes out. UC2: student moves sections without class promotion. UC3: operator retries failed bulk commit after connection loss. UC4: duplicate same-student selection rejected. UC5: records are audited for individual correction without undoing fee receipts.

**Domain rules and acceptance:** Preview/promote/repeat/graduate/leave end-of-year student batches with exceptions, destination classes, durable idempotent job progress and audit.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** SessionTransitionBatch(id,schoolId,sourceSessionId,targetSessionId,operatorId,idempotencyKey,requestHash,state,summary,createdAt,committedAt); SessionTransitionItem(batchId,studentId,decision,targetClassId,targetSectionId,version,status,errorCode). UNIQUE(schoolId,idempotencyKey), UNIQUE(batchId,studentId); bounded processing with replay markers.

**Typed endpoints and cross-domain facade contracts:** GET /operator/academic-sessions/:id/promotion-candidates?targetSessionId, POST .../promotion-preview {items}, POST .../promotion-commit {reviewToken,idempotencyKey}, GET .../promotion-batches/:batchId. Typed 409 stale enrollment, conflict, closed target; 422 invalid destination; 404 cross school.

**Detailed service orchestration, server algorithm and frontend states:** Preview fetches student snapshots by facade, checks section, school, status, target session. Commit revalidates versions, locks in deterministic order, ends source row and creates target row only if promote/repeat; for pass-out coordinate exit lifecycle CL-01. Batch engine persists per-row result and exposes retry failed rows only. UI editable grid with explicit actions, count summary and 'Review and confirm' flow.

**Recovery, idempotency, edge/race cases:** Fees and transport follow their OWN eligibility rules; promotion never copies debts as new charges. Promote of CLOSED source requires authorized close process sequencing. Handle previous-year student with unpaid balance but still promoting; client decision determines warning vs block.

## 3. Specific FE, BE and NFR tests

**FE:** TC-AS04-FE01 3 outcomes + section changes in one preview; FE02 invalid mapping highlighted; FE03 confirm summary exact counts; FE04 progress/errors and retry; FE05 repeat same operation doesn't duplicate; FE06 accessibility on 500-row table.

**BE/DB/API/security:** TC-AS04-BE01 duplicate batch idempotency; BE02 parallel commit conflict safe; BE03 source unchanged on invalid target; BE04 1 year-unique new enrollment; BE05 no cross-tenant section; BE06 pass-out event integration; BE07 audit by student.

**NFR/operations:** TC-AS04-NFR01 500 and 5000 students bounded chunks; NFR02 queue worker memory/timeout; NFR03 progress recovery after process restart; NFR04 zero duplicate target enrollments and fee variance after retries.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Functional workflows and all named FE/BE/NFR tests pass with reviewer approval, migration verification and explicit rollback procedure. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
