# TASK-007 — Academic year creation and first-year activation

**Deliverable ownership:** Academics. **Explicit completed predecessors:** TASK-001. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Add school-scoped AcademicSession and manage DRAFT creation/edit; allow initial activation only when no active session, enforce DB uniqueness under concurrency. Existing schools operate via explicit legacy compatibility until mapped.

**Not part of this task:** Do not require year-end transition, year close or promotion; they are independent later capabilities. Future DRAFT year can already be created.

## 2. Functional requirement, users and acceptance journeys

**User story:** As a platform administrator onboarding a DRAFT school, or as its authorized manager after activation, I can create and activate the first academic year (e.g. 2026–27), and plan subsequent DRAFT years without relying on the computer's calendar year.

**School use cases / required results:** UC1 school A creates 2026-04-01..2027-03-31, activates after no active year; UC2 school B independently has June–May year; UC3 second simultaneous activation fails with 409; UC4 school with legacy data retains old working routes until AS-08 reviewed mapping; UC5 manager prepares 2027–28 DRAFT before current year ends.

**Rules, permissions and policy boundaries:** At most one ACTIVE or CLOSING school year per school; DRAFT creation/edit separate from year closing. Date values are local DATE, timestamp UTC; no automatic activation of next calendar year. Activation of another session while ACTIVE or CLOSING exists must fail with 409 and explain closure transition capability when later available, but must not call a missing future handler.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** AcademicSession(id UUID, schoolId UUID, code varchar(32), label varchar(100), startDate DATE, endDate DATE, status DRAFT|ACTIVE|CLOSING|CLOSED, version int, createdBy UUID, createdAt, updatedAt, activatedAt?, closedAt?). Unique (schoolId,code); CHECK endDate>=startDate; partial UNIQUE schoolId WHERE status IN ('ACTIVE','CLOSING'). Migration adds table only, existing schools no immediate required FK.

**API contract, validation and status/errors:** GET /operator/academic-sessions?page&size; GET :id; POST {code,label,startDate,endDate}; PATCH :id {version,label,dates}; POST :id/activate {version}. Provide **separate PlatformAdminGuard** setup route /platform/schools/:schoolId/academic-sessions for a DRAFT school and MANAGER-only /operator/academic-sessions for ACTIVE school, both calling one shared AcademicsSessionService with explicit authorized school context; CSRF on writes; 409 duplicate/year active/conflict, 422 dates, 404 foreign school.

**Backend/service algorithm, module/public facades and FE binding:** New AcademicsSessionService owns lifecycle and transactions, locks School row before activation and audits actor/status. **Bootstrap:** Platform Admin can provision and initially activate a session for a DRAFT School without granting an unauthenticated/invalid operator login; school status remains independently DRAFT until existing school activation flow. School manager can create sessions only when valid active operator auth is available. No direct Students/Fees table reads; publish active-session lookup port. Web Academic Sessions setup shows list and DRAFT editor, initial activation with confirmation; 'Close Year' not shown until TASK-025, no dead action.

**Failures, concurrency, idempotency and edge cases:** Student imports/old fee routes continue in compatibility mode for tenants awaiting session mapping; no historic year invented. Opening 2027–28 remains DRAFT until prior close introduced later. School ACTIVE and AcademicSession ACTIVE are independent concepts.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** FE01 create/edit and activate 2026–27; FE02 invalid dates; FE03 second active refusal; FE04 Platform Admin creates session for DRAFT school and Operator after school activation uses same records; FE05 old school bootstrap remains possible; FE05 360/768/1366 keyboard/a11y.

**Backend BE cases:** BE01 SQL partial unique under 50 concurrent activations; BE02 school IDOR; BE03 version collision 409; BE04 Platform Admin DRAFT bootstrap permitted and wrong-school protected; BE05 operator cannot bypass school activation; BE06 old tenants still log in; BE05 correct Kolkata DATE and audit.

**Nonfunctional NFR cases:** NFR01 table index plan 10k schools; NFR02 no DB down migration; NFR03 session lookup no-cache tenant leak; NFR04 benchmark read/write.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.

## Bootstrap acceptance (architecture-critical)

When `School.status=DRAFT` and no operator can log in, Platform Admin must be able to configure the academic session via a platform-protected route; otherwise a future readiness gate requiring a session would deadlock. Do **not** relax OperatorGuard on inactive schools. Replay test: new draft school → admin create initial session → school activate using existing authorized path → operator provision/login → view same active session. TASK-011 may later add additional readiness criteria, but TASK-007 must work independently now.
