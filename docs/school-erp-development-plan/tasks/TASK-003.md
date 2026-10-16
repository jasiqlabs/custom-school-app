# TASK-003 — Official school identity fields and configuration

**Deliverable:** School | **Requires:** none | **Decision gate:** SPEC_SYNC_REQUIRED | **Risk reviewer:** **LOW** | **Execution status:** [single tracker](../TASK-TRACKER.md).

> This is an **implementation specification**, not a record of work completed or an already approved canonical Harness DLD. Do not change an existing route/record without verifying it against `main` and obtaining any needed Harness revision approval.

## 1. Business acceptance

**Story:** As platform administrator, I enter the school's official identifiers once at the school level, without asking each student to enter the school UDISE again.

**User journeys from requirements:** UC1: new school stores UDISE 00001234567 and displays its leading zeroes. UC2: existing school adds affiliation number without overwriting principal. UC3: school with absent identifiers continues using current ERP while profile shows missing values. UC4: wrong tenant cannot edit another school.

**Invariant and policy:** Codes are school-level strings; preserve leading zeroes/case where relevant. Optional until client confirms mandatory status/validation and jurisdiction; no unapproved format constraints. Apply optimistic school version to edits and audit who changed identifiers.

**Task boundary:** No unapproved compulsory UDISE format or uniqueness constraint; some tenants legitimately lack identifier. No later TASK service is required for this task to build, operate or be tested.

### Acceptance example / golden scenario
On School A use '00001234567', clear affiliation and reload; School B remains unchanged. Old principal/signature/logo still render. Invalid/long code rejected without partial write.

## 2. DLD — Existing system & ownership

**Actual main files to inspect first:** `prisma/schema.prisma`<br>`apps/api/src/modules/platform-admin/schools/schools.service.ts`<br>`apps/api/src/modules/platform-admin/schools/schools.controller.ts`<br>`apps/web/src/app/admin/(protected)/schools/[schoolId]/ui.tsx`

**Domain responsibility:** School owns the new state or coordinates via an approved public facade. All operator school IDs come from the verified server actor, Platform Admin uses its own authenticated school selector; no sibling Prisma reach-through. Shared payload validation belongs to Zod/contracts, not duplicated backend/frontend regex.

**Known current design / proposed persistence:** Add nullable School.udiseNumber varchar(32), schoolCode varchar(64), affiliationNumber varchar(64) with CHECK length by validator, no blanket unique until approved; migrate additive. Preserve School.id UUID; no relation to old Student.udiseCode except deprecation FB-03.

### Migration sequence (required, not optional)
1. On a disposable database seeded with **two different schools** and legacy paid/partial/void/TC records, apply an **additive** Prisma migration (nullable fields and independent tables first).
2. Verify old code paths continue to read and write without new non-null field requirements. Preserve UUID, receipt number, prior-year identity and file checksum.
3. Where historical backfill is required, use a deterministic per-school dry-run with reviewed match evidence, idempotent UPSERT/conflict semantics and explicit `UNKNOWN/UNVERIFIED` handling rather than guessing historic school data.
4. Add adapters/feature-gated cutover, compare before/after affected counts and values. Never drop an old table/field in the same feature; a rollback of *financial* production writes usually means safe roll-forward, not deleting new charges.
5. Record migration SQL, `prisma migrate status`, affected row counts and rollback/restore rehearsal for reviewer.

## 3. DLD — HTTP, authorization & public contracts

**Proposed endpoints/DTOs:** Extend existing POST/PATCH/GET /platform/schools and school detail DTOs, Zod inputs; expose safe school identity read facade to Students print/TC document owners. PATCH requires {version}; on stale return 409.

**Input/output constraints:** validate school-owned UUIDs, appropriate business-date strings `YYYY-MM-DD`, concurrency/version tokens on updates, idempotency keys on retries and PII-safe read projections. Preserve all old paths/methods or implement and test a compatibility adapter; avoid forcing API changes to other working pages.

**Expected typed errors:** 401 missing/expired session, 403 unauthorized role/capability, 404 foreign-school object (avoid ID existence leak), 409 stale version/duplicate/invalid business transition, 422 invalid inputs, 503 transient file/queue/unavailable dependency. Every write remains CSRF protected and auditable.

## 4. DLD — Exact implementation sequence

1. Expand School schema with nullable udiseNumber, schoolCode and affiliationNumber string fields; do not coerce to numbers, preserve leading zeros.
2. Extend existing SchoolsService.create/update/get plus Zod and typed DTO, optimistic version and audit; existing schools with NULL codes remain valid.
3. Update platform admin new/edit/detail school forms and school identity read facade used later by admission forms and PDFs.
4. Keep principal, logo, school status and original school UUID untouched; explicit case for clearing previously entered identifier.

**Existing workflow integration:** Admin school create/profile form labeled 'School UDISE Number', 'School Code', 'Affiliation Number'; ability to clear/save; normalized trimmed inputs with no numeric coercion; document consumers use frozen issuance snapshot, not dynamic lookup each print.

**Recovery and concurrency:** Legacy tenants lacking values should render em dash, not invented defaults. School identifiers are business codes not hard security IDs; use UUID for authorization.

**Specific safety watch:** Keep previous route payloads, the old student/month money model and completed document snapshots compatible while delivering the new capability.

## 5. DLD — Frontend screen and UI state contract

- **Entry/navigation:** use the existing admin or operator screen under `apps/web/src/app`; do not replace unrelated navigation or build a dead button for a later task.
- **Render:** show correct label, values and school context from server, accessible input labels, 360/768/1366 layouts, loading/empty/error/ready/success states, and a short human-readable reason for 409/422.
- **Write UX:** validate before submit, prevent accidental double-submit and stale overwrite, retain form data on recoverable error, refresh server state on successful save and provide clear next action.
- **Preserve existing FE:** rerun impacted routes before/after any redesign; a different layout is permitted but previously working actions, link targets, permissions and print behavior must still work.
- **Source-backed UI checks:** TASK-003-FE01 Create a school with UDISE, School Code and Affiliation Number; TASK-003-FE02 preserve leading zeroes on save/reload; TASK-003-FE03 old school with null identifiers remains editable and official form renders gracefully; TASK-003-FE04 update/clear field with version conflict message; TASK-003-FE05 mobile 360, tablet 768, desktop 1366, labels/tab order and no broken existing school card.

## 6. Test cases — FE, BE, NFR (record evidence; not just checkboxes)

**Frontend acceptance tests:** TASK-003-FE01 Create a school with UDISE, School Code and Affiliation Number; TASK-003-FE02 preserve leading zeroes on save/reload; TASK-003-FE03 old school with null identifiers remains editable and official form renders gracefully; TASK-003-FE04 update/clear field with version conflict message; TASK-003-FE05 mobile 360, tablet 768, desktop 1366, labels/tab order and no broken existing school card.

**Backend unit/API/database tests:** TASK-003-BE01 migration on populated school; TASK-003-BE02 version conflict; TASK-003-BE03 admin-only mutation; TASK-003-BE04 safe GET tenant selection; TASK-003-BE05 no loss of school name/logo/principal.

**NFR, security, load and recovery tests:** TASK-003-NFR01 additive zero downtime migration; TASK-003-NFR02 audit metadata without unnecessary identifier duplication; TASK-003-NFR03 indexed existing school query unaffected; TASK-003-NFR04 privacy/no-store policies.

**Test environment:** synthetic School A and B; fresh and existing records; valid/invalid IDs; MANAGER, Platform Admin and REPORT_VIEWER when implemented. Capture exact request/response/error snapshots, UI screenshots and timings *before and after*. All status is tracked in the single tracker, not here.

**Mandatory old-function regression:** BASE-02,14,15. Re-run old login/session rules, class/student admission/search/import, monthly fee generation/pay/void/receipt, transports, dashboard/report exports, platform TC and private files **where touched**. See [REGRESSION-BASELINE](../REGRESSION-BASELINE.md).

## 7. Deployment & Definition of Done

- Task builds/deploys with **only listed completed predecessors**, no assumptions on later task IDs.
- Changed schema and API are compatible with old data/clients, with durable audit/CSRF/tenant isolation.
- New FE/BE/NFR cases and impacted BASE tests executed and actual logs/screens/metrics linked; old journeys not broken.
- Reviewer approves any intentional behavioral replacement and risky migration (senior review on auth, PII, fees, academic migration, documents).
- `git diff --check`, targeted/full tests, browser walkthrough, API integration, environment baseline and rollback plan are recorded.
- **Only then** reviewer updates [TASK-TRACKER.md](../TASK-TRACKER.md) to DONE after approved integration. Do not mark an intern's self-test as independent signoff.
