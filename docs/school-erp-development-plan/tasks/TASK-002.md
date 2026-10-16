# TASK-002 — Reports-only operator experience and exports

**Deliverable:** Access control | **Requires:** TASK-001 | **Decision gate:** SPEC_SYNC_REQUIRED | **Risk reviewer:** **HIGH** | **Execution status:** [single tracker](../TASK-TRACKER.md).

> This is an **implementation specification**, not a record of work completed or an already approved canonical Harness DLD. Do not change an existing route/record without verifying it against `main` and obtaining any needed Harness revision approval.

## 1. Business acceptance

**Story:** School owner assigns Operator 1 who can only view authorized reports and download them, but cannot edit or see sensitive student profiles.

**User journeys from requirements:** UC1: a reports-only operator logs in to a reports-oriented navigation. UC2: downloads permitted month-wise fee XLSX for own school. UC3: POST fee collection returns 403 even via curl with valid login+CSRF. UC4: GET arbitrary student private profile not allowed. UC5: tenant B report URL cannot be fetched by tenant A.

**Invariant and policy:** 'View all Reports' must be translated into explicit report allow-list and allowed columns; not 'all GET requests'. Non-report modules e.g. student entry/transport editing should not be exposed. All privileged admin routes stay platform-only. Client must confirm list of reports and PII visibility.

**Task boundary:** Report list and visible PII columns are explicit product decisions. No sensitive data auto-exposed because a GET is called 'report'. No later TASK service is required for this task to build, operate or be tested.

### Acceptance example / golden scenario
Create report viewer A and manager B. Viewer can view approved pending report and download authorized XLSX, cannot view sensitive student profile or trigger assessment; manager unaffected; school B UUID returns 404.

## 2. DLD — Existing system & ownership

**Actual main files to inspect first:** `apps/api/src/modules/fees/controllers/fees.controller.ts`<br>`apps/api/src/modules/operator-dashboard/controllers/operator-dashboard.controller.ts`<br>`apps/api/src/modules/fees/application/fee-exports.service.ts`<br>`apps/web/src/app/operator/ui.tsx`

**Domain responsibility:** Access control owns the new state or coordinates via an approved public facade. All operator school IDs come from the verified server actor, Platform Admin uses its own authenticated school selector; no sibling Prisma reach-through. Shared payload validation belongs to Zod/contracts, not duplicated backend/frontend regex.

**Known current design / proposed persistence:** SchoolOperator.role enum REPORT_VIEWER|MANAGER from FB-08; capability matrix REPORTS_READ and REPORTS_DOWNLOAD, optionally report-specific scopes if confirmed. No direct access to StudentPrivateProfile; job/report rows bind schoolId and authorized actor with private file permission.

### Migration sequence (required, not optional)
1. On a disposable database seeded with **two different schools** and legacy paid/partial/void/TC records, apply an **additive** Prisma migration (nullable fields and independent tables first).
2. Verify old code paths continue to read and write without new non-null field requirements. Preserve UUID, receipt number, prior-year identity and file checksum.
3. Where historical backfill is required, use a deterministic per-school dry-run with reviewed match evidence, idempotent UPSERT/conflict semantics and explicit `UNKNOWN/UNVERIFIED` handling rather than guessing historic school data.
4. Add adapters/feature-gated cutover, compare before/after affected counts and values. Never drop an old table/field in the same feature; a rollback of *financial* production writes usually means safe roll-forward, not deleting new charges.
5. Record migration SQL, `prisma migrate status`, affected row counts and rollback/restore rehearsal for reviewer.

## 3. DLD — HTTP, authorization & public contracts

**Proposed endpoints/DTOs:** GET /operator/reports/* and GET authorized export status/download restricted to reports.read/download; POST config/payment/student/transport/promotion/TC always 403. Legacy operator GET routes treated as sensitive until reviewed; deny-by-default. For new reports API use server projection from approved report facades.

**Input/output constraints:** validate school-owned UUIDs, appropriate business-date strings `YYYY-MM-DD`, concurrency/version tokens on updates, idempotency keys on retries and PII-safe read projections. Preserve all old paths/methods or implement and test a compatibility adapter; avoid forcing API changes to other working pages.

**Expected typed errors:** 401 missing/expired session, 403 unauthorized role/capability, 404 foreign-school object (avoid ID existence leak), 409 stale version/duplicate/invalid business transition, 422 invalid inputs, 503 transient file/queue/unavailable dependency. Every write remains CSRF protected and auditable.

## 4. DLD — Exact implementation sequence

1. Build REPORT_VIEWER navigation strictly from GET /operator/me/capabilities or trusted server role response, displaying only permitted reports and export actions.
2. Create a method-by-method report allowlist. Existing XLSX export uses **POST /operator/fees/exports/pending**, so grant a narrow reports.export capability while preserving CSRF—not blanket POST permission.
3. Audit report facade for GET-triggered assessment. Use pure read projection; unauthorized signed URLs, direct student profile and fee payment mutations must fail even via guessed paths.
4. When a background export is ready, recheck current user role and school scope before signed private download; bind snapshot filters, year and school to export record.

**Existing workflow integration:** Use capability guard/decorator on each report route and secure file resolution; nav server-derived capability DTO. Dashboard should not accidentally count as all reports unless approved. Link accessible 'Download' only for report resources. Role changed during session triggers invalidation from FB-08.

**Recovery and concurrency:** No client-side role flag as authority, no hiding bypass; export job must re-check permission at download time. Audit denied write attempts without exposing sensitive inputs. Report filtration as-of session applies AS-06.

**Specific safety watch:** Optional future report pages remain hidden; this deliverable must be usable immediately with existing pending/collection reports.

## 5. DLD — Frontend screen and UI state contract

- **Entry/navigation:** use the existing admin or operator screen under `apps/web/src/app`; do not replace unrelated navigation or build a dead button for a later task.
- **Render:** show correct label, values and school context from server, accessible input labels, 360/768/1366 layouts, loading/empty/error/ready/success states, and a short human-readable reason for 409/422.
- **Write UX:** validate before submit, prevent accidental double-submit and stale overwrite, retain form data on recoverable error, refresh server state on successful save and provide clear next action.
- **Preserve existing FE:** rerun impacted routes before/after any redesign; a different layout is permitted but previously working actions, link targets, permissions and print behavior must still work.
- **Source-backed UI checks:** TASK-002-FE01 show only permitted report sections; TASK-002-FE02 accurate downloadable filtered report; TASK-002-FE03 no write control; TASK-002-FE04 direct URL to unauthorized page yields safe 403/redirect; TASK-002-FE05 mobile/tablet and screen reader.

## 6. Test cases — FE, BE, NFR (record evidence; not just checkboxes)

**Frontend acceptance tests:** TASK-002-FE01 show only permitted report sections; TASK-002-FE02 accurate downloadable filtered report; TASK-002-FE03 no write control; TASK-002-FE04 direct URL to unauthorized page yields safe 403/redirect; TASK-002-FE05 mobile/tablet and screen reader.

**Backend unit/API/database tests:** TASK-002-BE01 enumerate every operator route in table-driven role test and assert deny/allow; TASK-002-BE02 CSRF-valid direct mutation still denied; TASK-002-BE03 source file direct URL cannot leak; TASK-002-BE04 cross-tenant IDs 404; TASK-002-BE05 downgrade active session revoked; TASK-002-BE06 sensitive PII fields absent.

**NFR, security, load and recovery tests:** TASK-002-NFR01 fuzz role escalation and BOLA; TASK-002-NFR02 job/report permission revalidation; TASK-002-NFR03 cache partition by tenant role session; TASK-002-NFR04 PDF/XLSX formula injection and PII leakage tests.

**Test environment:** synthetic School A and B; fresh and existing records; valid/invalid IDs; MANAGER, Platform Admin and REPORT_VIEWER when implemented. Capture exact request/response/error snapshots, UI screenshots and timings *before and after*. All status is tracked in the single tracker, not here.

**Mandatory old-function regression:** BASE-05,09,11,12,16. Re-run old login/session rules, class/student admission/search/import, monthly fee generation/pay/void/receipt, transports, dashboard/report exports, platform TC and private files **where touched**. See [REGRESSION-BASELINE](../REGRESSION-BASELINE.md).

## 7. Deployment & Definition of Done

- Task builds/deploys with **only listed completed predecessors**, no assumptions on later task IDs.
- Changed schema and API are compatible with old data/clients, with durable audit/CSRF/tenant isolation.
- New FE/BE/NFR cases and impacted BASE tests executed and actual logs/screens/metrics linked; old journeys not broken.
- Reviewer approves any intentional behavioral replacement and risky migration (senior review on auth, PII, fees, academic migration, documents).
- `git diff --check`, targeted/full tests, browser walkthrough, API integration, environment baseline and rollback plan are recorded.
- **Only then** reviewer updates [TASK-TRACKER.md](../TASK-TRACKER.md) to DONE after approved integration. Do not mark an intern's self-test as independent signoff.
