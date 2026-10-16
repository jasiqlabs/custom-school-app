# TASK-008 — Session-scoped student enrollment and migration

**Deliverable ownership:** Students. **Explicit completed predecessors:** TASK-007. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Every StudentEnrollment belongs to school-owned AcademicSession with historical class/section snapshots; preserve current endpoints through active-year default adapter and verify legacy mapping before enforce NOT NULL.

**Not part of this task:** Do not silently assign older enrollments to today's academic year or rewrite historic TC files.

## 2. Functional requirement, users and acceptance journeys

**User story:** As a school staff member, I can see which class/section a student belonged to in each academic year even after a promotion or transfer.

**School use cases / required results:** UC1: same student ID enrolled in Nursery A (2026–27), LKG B (2027–28). UC2: parent requests old admission form or TC for previous year. UC3: current class renamed and prior-year print must preserve originally recorded label. UC4: import legacy rows without clear session with operator reconciliation screen.

**Rules, permissions and policy boundaries:** Every StudentEnrollment belongs to school-owned AcademicSession with historical class/section snapshots; preserve current endpoints through active-year default adapter and verify legacy mapping before enforce NOT NULL.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** Add StudentEnrollment.academicSessionId nullable initially, endedReason, effective dates and class/section name snapshots; composite same-school FK to AcademicSession(schoolId,id). Partial unique active enrollment index on (schoolId,studentId,academicSessionId) and temporal-overlap protection with approved rules. Migrate via legacy map table and verified backfill; only make FK non-null once all rows explicitly mapped.

**API contract, validation and status/errors:** Existing /operator/students listing/profile/admission-form take optional academicSessionId with server validated school/session ownership; add GET /operator/students/:id/enrollments?academicSessionId. POST admission includes active session selection/inference; return explicit sessionId and enrollmentVersion in response.

**Backend/service algorithm, module/public facades and FE binding:** Students aggregate owns enrollment writes; AcademicsPublicFacade validates year and writable state; class/section verified same-school before INSERT. History queries use saved name snapshots where appropriate. Web student directory/session selector and history timeline render current/historic period separately. TC obtains StudentsPublicFacade.snapshotAtSession rather than querying student tables.

**Failures, concurrency, idempotency and edge cases:** Backfill cannot infer old class from current class if history absent; mark 'legacy unverified' until school confirms. Reenrollment after returning must not steal prior row. No constraint implying only one enrollment over all years in new design.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** TC-AS03-FE01 switch 2026–27 to 2027–28 in profile, show different class; FE02 old-year read-only; FE03 student with unclassified legacy history shows 'Review required'; FE04 print headers correct year; FE05 responsive timeline.

**Backend BE cases:** TC-AS03-BE01 composite FK and partial uniqueness; BE02 same-school scope on session/class/section/student; BE03 concurrent registration prevents duplicate; BE04 historical print immutability; BE05 legacy migration replay/idempotency; BE06 class rename doesn't alter saved year snapshot.

**Nonfunctional NFR cases:** TC-AS03-NFR01 student code p95 <1s at 5000 students, name p95<1.5s inherited; NFR02 bounded server pagination/indexes; NFR03 no loss of existing enrollments; NFR04 audit metadata privacy & backups.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
