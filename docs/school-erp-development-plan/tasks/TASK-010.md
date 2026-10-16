# TASK-010 — Current-year context in existing student screens

**Deliverable ownership:** Web / Students. **Explicit completed predecessors:** TASK-007, TASK-008. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Expose active year and a school-year picker for student directory/profile/admission/history only, sourced from server session-aware academic year. Switching years must display accurate enrollment labels.

**Not part of this task:** Fee reports/exports are not part of this increment; TASK-026 extends the selector when those backend projections are ready.

## 2. Functional requirement, users and acceptance journeys

**User story:** As an operator, I always know which academic year I am viewing on student screens and can inspect older enrollment without mixing with the current year.

**School use cases / required results:** UC1 current active year defaults in directory; UC2 choose 2025–26 and see historic class; UC3 direct shared link with foreign-school year rejected; UC4 reload retains selected year; UC5 archived student view allows no edit.

**Rules, permissions and policy boundaries:** Only Student screens are activated in this increment. No fee statement/report selector dependence on later tasks. A shared validated school year route/query contract is established for future extension, but does not call future modules.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** No new DB tables beyond TASK-007/008; add school+academicSessionId indexes on student directory queries where required. Safe legacy context for schools without migrated enrollment.

**API contract, validation and status/errors:** GET /operator/academic-sessions/current and optional ?academicSessionId on student list/profile/admission-form history endpoints. Require server validation of school ownership and ability to access CLOSED year; default DB ACTIVE not browser current date.

**Backend/service algorithm, module/public facades and FE binding:** Next.js shared YearSelector in operator Students header, query-string or app context derived from verified sessions list. All student API clients pass chosen year; screens display ACTIVE / CLOSED and enforce view-only context; state remains correct on browser refresh/back.

**Failures, concurrency, idempotency and edge cases:** Selecting previous year must not silently move a pupil's actual enrollment or change fee config. Screens without year support do not inherit invalid global state. Do not show an unsafe 'All Years edit'.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** FE01 current default; FE02 historic class; FE03 URL restore and switch; FE04 accessibility 360/768/1366; FE05 blank legacy migration notice.

**Backend BE cases:** BE01 foreign school session ID 404; BE02 closed-year write deny; BE03 pagination with year; BE04 current default when active, explicit legacy fallback; BE05 no old student route break.

**Nonfunctional NFR cases:** NFR01 session+school cache isolation, NFR02 directory query p95 validated, NFR03 no-store profile, NFR04 screen reader labels.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
