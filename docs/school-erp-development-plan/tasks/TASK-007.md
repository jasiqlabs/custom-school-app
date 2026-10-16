# TASK-007 — Academic year creation and initial activation

**Deliverable:** Academics | **Requires:** TASK-001 | **Decision gate:** SPEC_SYNC_REQUIRED | **Risk reviewer:** **HIGH** | **Execution status:** [single tracker](../TASK-TRACKER.md).

> This is an **implementation specification**, not a record of work completed or an already approved canonical Harness DLD. Do not change an existing route/record without verifying it against `main` and obtaining any needed Harness revision approval.

## 1. Business acceptance

**Story:** As a platform administrator onboarding a DRAFT school, or as its authorized manager after activation, I can create and activate the first academic year (e.g. 2026–27), and plan subsequent DRAFT years without relying on the computer's calendar year.

**User journeys from requirements:** UC1 school A creates 2026-04-01..2027-03-31, activates after no active year; UC2 school B independently has June–May year; UC3 second simultaneous activation fails with 409; UC4 school with legacy data retains old working routes until AS-08 reviewed mapping; UC5 manager prepares 2027–28 DRAFT before current year ends.

**Invariant and policy:** At most one ACTIVE or CLOSING school year per school; DRAFT creation/edit separate from year closing. Date values are local DATE, timestamp UTC; no automatic activation of next calendar year. Activation of another session while ACTIVE or CLOSING exists must fail with 409 and explain closure transition capability when later available, but must not call a missing future handler.

**Task boundary:** Confirm school year date conventions; no automatic calendar-based rollover. No later TASK service is required for this task to build, operate or be tested.

### Acceptance example / golden scenario
DRAFT School→Admin creates/activates year→School activated→Operator provision/login and sees same year; another tenant independent; two simultaneous activate calls yield exactly one winner.

## 2. DLD — Existing system & ownership

**Actual main files to inspect first:** `apps/api/src/modules/platform-admin/academics/academics.service.ts`<br>`apps/api/src/modules/platform-admin/academics/academics.controller.ts`<br>`prisma/schema.prisma`

**Domain responsibility:** Academics owns the new state or coordinates via an approved public facade. All operator school IDs come from the verified server actor, Platform Admin uses its own authenticated school selector; no sibling Prisma reach-through. Shared payload validation belongs to Zod/contracts, not duplicated backend/frontend regex.

**Known current design / proposed persistence:** AcademicSession(id UUID, schoolId UUID, code varchar(32), label varchar(100), startDate DATE, endDate DATE, status DRAFT|ACTIVE|CLOSING|CLOSED, version int, createdBy UUID, createdAt, updatedAt, activatedAt?, closedAt?). Unique (schoolId,code); CHECK endDate>=startDate; partial UNIQUE schoolId WHERE status IN ('ACTIVE','CLOSING'). Migration adds table only, existing schools no immediate required FK.

### Migration sequence (required, not optional)
1. On a disposable database seeded with **two different schools** and legacy paid/partial/void/TC records, apply an **additive** Prisma migration (nullable fields and independent tables first).
2. Verify old code paths continue to read and write without new non-null field requirements. Preserve UUID, receipt number, prior-year identity and file checksum.
3. Where historical backfill is required, use a deterministic per-school dry-run with reviewed match evidence, idempotent UPSERT/conflict semantics and explicit `UNKNOWN/UNVERIFIED` handling rather than guessing historic school data.
4. Add adapters/feature-gated cutover, compare before/after affected counts and values. Never drop an old table/field in the same feature; a rollback of *financial* production writes usually means safe roll-forward, not deleting new charges.
5. Record migration SQL, `prisma migrate status`, affected row counts and rollback/restore rehearsal for reviewer.

## 3. DLD — HTTP, authorization & public contracts

**Proposed endpoints/DTOs:** GET /operator/academic-sessions?page&size; GET :id; POST {code,label,startDate,endDate}; PATCH :id {version,label,dates}; POST :id/activate {version}. Provide **separate PlatformAdminGuard** setup route /platform/schools/:schoolId/academic-sessions for a DRAFT school and MANAGER-only /operator/academic-sessions for ACTIVE school, both calling one shared AcademicsSessionService with explicit authorized school context; CSRF on writes; 409 duplicate/year active/conflict, 422 dates, 404 foreign school.

**Input/output constraints:** validate school-owned UUIDs, appropriate business-date strings `YYYY-MM-DD`, concurrency/version tokens on updates, idempotency keys on retries and PII-safe read projections. Preserve all old paths/methods or implement and test a compatibility adapter; avoid forcing API changes to other working pages.

**Expected typed errors:** 401 missing/expired session, 403 unauthorized role/capability, 404 foreign-school object (avoid ID existence leak), 409 stale version/duplicate/invalid business transition, 422 invalid inputs, 503 transient file/queue/unavailable dependency. Every write remains CSRF protected and auditable.

## 4. DLD — Exact implementation sequence

1. Add AcademicSession as tenant-scoped master aggregate with code, school-local DATE bounds, DRAFT/ACTIVE/CLOSING/CLOSED and version. Enforce unique school/code and at-most-one ACTIVE or CLOSING year per school via Postgres partial index.
2. Provide **Platform Admin** year setup for DRAFT schools (pre-operator bootstrap) and school MANAGER routes for ACTIVE schools; both call one service using actor-validated school scope.
3. Initial activate path obtains school row lock, checks existing active/closing year and version, performs status change + audit atomically; DRAFT future years may coexist.
4. Maintain legacy schools without year via explicit compatibility mode; do not fabricate old mapping or start year-close/promotion in this task.

**Existing workflow integration:** New AcademicsSessionService owns lifecycle and transactions, locks School row before activation and audits actor/status. **Bootstrap:** Platform Admin can provision and initially activate a session for a DRAFT School without granting an unauthenticated/invalid operator login; school status remains independently DRAFT until existing school activation flow. School manager can create sessions only when valid active operator auth is available. No direct Students/Fees table reads; publish active-session lookup port. Web Academic Sessions setup shows list and DRAFT editor, initial activation with confirmation; 'Close Year' not shown until TASK-025, no dead action.

**Recovery and concurrency:** Student imports/old fee routes continue in compatibility mode for tenants awaiting session mapping; no historic year invented. Opening 2027–28 remains DRAFT until prior close introduced later. School ACTIVE and AcademicSession ACTIVE are independent concepts.

**Specific safety watch:** This resolves the proven bootstrap deadlock: current OperatorsService.create requires School ACTIVE. Do not weaken inactive-school login to work around it.

## 5. DLD — Frontend screen and UI state contract

- **Entry/navigation:** use the existing admin or operator screen under `apps/web/src/app`; do not replace unrelated navigation or build a dead button for a later task.
- **Render:** show correct label, values and school context from server, accessible input labels, 360/768/1366 layouts, loading/empty/error/ready/success states, and a short human-readable reason for 409/422.
- **Write UX:** validate before submit, prevent accidental double-submit and stale overwrite, retain form data on recoverable error, refresh server state on successful save and provide clear next action.
- **Preserve existing FE:** rerun impacted routes before/after any redesign; a different layout is permitted but previously working actions, link targets, permissions and print behavior must still work.
- **Source-backed UI checks:** FE01 create/edit and activate 2026–27; FE02 invalid dates; FE03 second active refusal; FE04 Platform Admin creates session for DRAFT school and Operator after school activation uses same records; FE05 old school bootstrap remains possible; FE05 360/768/1366 keyboard/a11y.

## 6. Test cases — FE, BE, NFR (record evidence; not just checkboxes)

**Frontend acceptance tests:** FE01 create/edit and activate 2026–27; FE02 invalid dates; FE03 second active refusal; FE04 Platform Admin creates session for DRAFT school and Operator after school activation uses same records; FE05 old school bootstrap remains possible; FE05 360/768/1366 keyboard/a11y.

**Backend unit/API/database tests:** BE01 SQL partial unique under 50 concurrent activations; BE02 school IDOR; BE03 version collision 409; BE04 Platform Admin DRAFT bootstrap permitted and wrong-school protected; BE05 operator cannot bypass school activation; BE06 old tenants still log in; BE05 correct Kolkata DATE and audit.

**NFR, security, load and recovery tests:** NFR01 table index plan 10k schools; NFR02 no DB down migration; NFR03 session lookup no-cache tenant leak; NFR04 benchmark read/write.

**Test environment:** synthetic School A and B; fresh and existing records; valid/invalid IDs; MANAGER, Platform Admin and REPORT_VIEWER when implemented. Capture exact request/response/error snapshots, UI screenshots and timings *before and after*. All status is tracked in the single tracker, not here.

**Mandatory old-function regression:** BASE-02,03,04,06,16. Re-run old login/session rules, class/student admission/search/import, monthly fee generation/pay/void/receipt, transports, dashboard/report exports, platform TC and private files **where touched**. See [REGRESSION-BASELINE](../REGRESSION-BASELINE.md).

## 7. Deployment & Definition of Done

- Task builds/deploys with **only listed completed predecessors**, no assumptions on later task IDs.
- Changed schema and API are compatible with old data/clients, with durable audit/CSRF/tenant isolation.
- New FE/BE/NFR cases and impacted BASE tests executed and actual logs/screens/metrics linked; old journeys not broken.
- Reviewer approves any intentional behavioral replacement and risky migration (senior review on auth, PII, fees, academic migration, documents).
- `git diff --check`, targeted/full tests, browser walkthrough, API integration, environment baseline and rollback plan are recorded.
- **Only then** reviewer updates [TASK-TRACKER.md](../TASK-TRACKER.md) to DONE after approved integration. Do not mark an intern's self-test as independent signoff.
