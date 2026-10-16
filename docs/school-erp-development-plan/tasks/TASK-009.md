# TASK-009 — Effective-dated class and section history

**Deliverable ownership:** Students. **Explicit completed predecessors:** TASK-008. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Support intra-year class/section enrollment changes with effective dates and immutable previous segments, as school operations independent of fee charge policy.

**Not part of this task:** Do not expose a retroactive financial recalculation in this task. Existing billing retains compatible behavior; TASK-014 connects fee eligibility and change effective dates.

## 2. Functional requirement, users and acceptance journeys

**User story:** As an authorized operator, I change a student's class or section effective from a chosen date, retaining the previous assignment for historical reports and printed evidence.

**School use cases / required results:** UC1 Class 2A until 2026-10-14 and Class 3B from 2026-10-15 shows two dated segments; UC2 same-section change preserves original label snapshot; UC3 backdated overlapping change fails unless approved adjustment workflow; UC4 old session CLOSED cannot be edited; UC5 current class query stays correct under compatible reads.

**Rules, permissions and policy boundaries:** No overlapping active effective enrollment segments for one student; exactly one class/section at a specific school date. Approved class change does not itself generate/recalculate tuition; fee eligibility under dated segments is delivered in TASK-014.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** StudentEnrollment academicSessionId, classId, sectionId, validFrom DATE, validUntil DATE nullable, endedReason CLASS_CHANGE, classNameSnapshot and sectionNameSnapshot plus version. Constraints school/student/year and exclusion overlap (PostgreSQL range/exclusion or transactional lock with indexed bounds). Legacy Enrollment ACTIVE indicates latest segment only.

**API contract, validation and status/errors:** PATCH /operator/students/:id/enrollment {academicSessionId,classId,sectionId,effectiveDate,expectedVersion,reason?}; GET /operator/students/:id/enrollment-history?sessionId. Response ordered segment history with date bounds; reject 409 overlap/version/closed year, 422 out-of-year date.

**Backend/service algorithm, module/public facades and FE binding:** Students module owns locks and enrollment transition. Validate year via AcademicsPublicFacade and selected class/section same school, end old segment at day preceding new effectiveDate, create new segment with saved labels, append audit. Update existing profile class-edit form to request date and show a confirmation/history timeline; legacy fee generator remains backward-compatible with current segment for current month until new engine wired.

**Failures, concurrency, idempotency and edge cases:** Avoid leaving a student without enrollment on transient failure (single transaction). Rewriting historic segments requires correction workflow, not naïve row update. Backdated change if previously assessed fees requires warning but cannot wait on future ledger.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** FE01 two dated class segments and historical UI; FE02 invalid year/date; FE03 pick section, preserve class label; FE04 archived year read-only; FE05 interruption/retry.

**Backend BE cases:** BE01 exclusion/locking collision; BE02 immutable historic snapshots; BE03 school/session/class FK; BE04 existing student profile update regression; BE05 old monthly fee generator safe compatible operation.

**Nonfunctional NFR cases:** NFR01 5k student current lookup p95 <1s exact Student ID, NFR02 indexed date-as-of query, NFR03 error/accessibility and audit, NFR04 no destructive enrollment migration.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
