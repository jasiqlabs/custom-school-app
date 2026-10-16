# TASK-005 — Correct student UDISE input and admission form identity

**Deliverable:** Students | **Requires:** TASK-003 | **Decision gate:** SPEC_SYNC_REQUIRED | **Risk reviewer:** **MEDIUM** | **Execution status:** [single tracker](../TASK-TRACKER.md).

> This is an **implementation specification**, not a record of work completed or an already approved canonical Harness DLD. Do not change an existing route/record without verifying it against `main` and obtaining any needed Harness revision approval.

## 1. Business acceptance

**Story:** As a school operator, I stop entering the school's UDISE number on individual students and obtain accurate official identifiers on admission printouts.

**User journeys from requirements:** UC1: admit a student without student UDISE field; admission still succeeds. UC2: print admission form for school with all three identifiers and verify exact leading zeros. UC3: old school lacks affiliation number; form prints 'Not provided', no crash. UC4: existing Student.udiseCode remains in DB and old API client can read it during deprecation.

**Invariant and policy:** School identifiers are sourced solely from SchoolInfoPublicFacade; data migration is additive and no legacy student UDISE column is dropped. Admission printed year/class comes from Students enrollment read snapshot, not dynamically guessed from today's class.

**Task boundary:** No automatic import of student UDISE into school profile. No later TASK service is required for this task to build, operate or be tested.

### Acceptance example / golden scenario
Admit without UDISE; print for school with/without codes, keep student field in database and confirm old documents unchanged; ensure own school's identifiers used.

## 2. DLD — Existing system & ownership

**Actual main files to inspect first:** `apps/web/src/app/operator/students/new/ui.tsx`<br>`apps/api/src/modules/students/application/search-students.service.ts`<br>`apps/web/src/app/operator/students/[id]/admission-form/ui.tsx`

**Domain responsibility:** Students owns the new state or coordinates via an approved public facade. All operator school IDs come from the verified server actor, Platform Admin uses its own authenticated school selector; no sibling Prisma reach-through. Shared payload validation belongs to Zod/contracts, not duplicated backend/frontend regex.

**Known current design / proposed persistence:** No breaking Student column drop; keep Student.udiseCode nullable as legacy/deprecated. Extend AdmissionFormPrintDto.school with udiseNumber, schoolCode, affiliationNumber; null-safe school read model via School facade. No TC table/file change.

### Migration sequence (required, not optional)
1. On a disposable database seeded with **two different schools** and legacy paid/partial/void/TC records, apply an **additive** Prisma migration (nullable fields and independent tables first).
2. Verify old code paths continue to read and write without new non-null field requirements. Preserve UUID, receipt number, prior-year identity and file checksum.
3. Where historical backfill is required, use a deterministic per-school dry-run with reviewed match evidence, idempotent UPSERT/conflict semantics and explicit `UNKNOWN/UNVERIFIED` handling rather than guessing historic school data.
4. Add adapters/feature-gated cutover, compare before/after affected counts and values. Never drop an old table/field in the same feature; a rollback of *financial* production writes usually means safe roll-forward, not deleting new charges.
5. Record migration SQL, `prisma migrate status`, affected row counts and rollback/restore rehearsal for reviewer.

## 3. DLD — HTTP, authorization & public contracts

**Proposed endpoints/DTOs:** Existing GET /operator/students/:id/admission-form returns additional optional school identity fields. Student admission POST/PATCH allow legacy optional udiseCode for compatibility but new web form does not submit it; server ignores/archives according to approved migration decision. Never treat submitted student UDISE as school ID.

**Input/output constraints:** validate school-owned UUIDs, appropriate business-date strings `YYYY-MM-DD`, concurrency/version tokens on updates, idempotency keys on retries and PII-safe read projections. Preserve all old paths/methods or implement and test a compatibility adapter; avoid forcing API changes to other working pages.

**Expected typed errors:** 401 missing/expired session, 403 unauthorized role/capability, 404 foreign-school object (avoid ID existence leak), 409 stale version/duplicate/invalid business transition, 422 invalid inputs, 503 transient file/queue/unavailable dependency. Every write remains CSRF protected and auditable.

## 4. DLD — Exact implementation sequence

1. Remove only student-level UDISE input and validation from manual admission UI; do not drop or rewrite historical Student.udiseCode records.
2. Extend admission-form server print DTO by fetching School official identifiers from SchoolInfoPublicFacade, not from student UDISE field.
3. On admission form A4 template show school identifiers in school header with nullable display, and student class/section from current validated enrollment.
4. Maintain existing student creation/import payload compatibility; do not change TC template yet (TASK-029 is independent).

**Existing workflow integration:** Update apps/web/src/app/operator/students/new/ui.tsx to remove field+binding, including accessibility/validation; update SearchStudentsService.getAdmissionFormPrint via SchoolInfoPublicFacade and operator print UI to show codes in school header. Use A4 print CSS, bounded long lines. Deploy after TASK-003, no references to TC worker.

**Recovery and concurrency:** Old admission data may contain student UDISE; preserve it; never migrate it automatically to School fields. Cross-school printed school identity must be resolved by authenticated actor school; old API clients unaffected.

**Specific safety watch:** Keep previous route payloads, the old student/month money model and completed document snapshots compatible while delivering the new capability.

## 5. DLD — Frontend screen and UI state contract

- **Entry/navigation:** use the existing admin or operator screen under `apps/web/src/app`; do not replace unrelated navigation or build a dead button for a later task.
- **Render:** show correct label, values and school context from server, accessible input labels, 360/768/1366 layouts, loading/empty/error/ready/success states, and a short human-readable reason for 409/422.
- **Write UX:** validate before submit, prevent accidental double-submit and stale overwrite, retain form data on recoverable error, refresh server state on successful save and provide clear next action.
- **Preserve existing FE:** rerun impacted routes before/after any redesign; a different layout is permitted but previously working actions, link targets, permissions and print behavior must still work.
- **Source-backed UI checks:** FE01 form no student UDISE; FE02 A4 admission school codes including leading zeros; FE03 optional empty identifiers and long addresses; FE04 360/768/1366 + print styles.

## 6. Test cases — FE, BE, NFR (record evidence; not just checkboxes)

**Frontend acceptance tests:** FE01 form no student UDISE; FE02 A4 admission school codes including leading zeros; FE03 optional empty identifiers and long addresses; FE04 360/768/1366 + print styles.

**Backend unit/API/database tests:** BE01 Student legacy UDISE still readable; BE02 school identity from session/School facade, not student request; BE03 cross-school ID 404; BE04 existing admission payload remains supported; BE05 history print session/class correct.

**NFR, security, load and recovery tests:** NFR01 two-school PII/IDOR tests; NFR02 print PDF text extraction + 25-char codes; NFR03 zero migration deletion; NFR04 performance and no-store.

**Test environment:** synthetic School A and B; fresh and existing records; valid/invalid IDs; MANAGER, Platform Admin and REPORT_VIEWER when implemented. Capture exact request/response/error snapshots, UI screenshots and timings *before and after*. All status is tracked in the single tracker, not here.

**Mandatory old-function regression:** BASE-02,06,07,14. Re-run old login/session rules, class/student admission/search/import, monthly fee generation/pay/void/receipt, transports, dashboard/report exports, platform TC and private files **where touched**. See [REGRESSION-BASELINE](../REGRESSION-BASELINE.md).

## 7. Deployment & Definition of Done

- Task builds/deploys with **only listed completed predecessors**, no assumptions on later task IDs.
- Changed schema and API are compatible with old data/clients, with durable audit/CSRF/tenant isolation.
- New FE/BE/NFR cases and impacted BASE tests executed and actual logs/screens/metrics linked; old journeys not broken.
- Reviewer approves any intentional behavioral replacement and risky migration (senior review on auth, PII, fees, academic migration, documents).
- `git diff --check`, targeted/full tests, browser walkthrough, API integration, environment baseline and rollback plan are recorded.
- **Only then** reviewer updates [TASK-TRACKER.md](../TASK-TRACKER.md) to DONE after approved integration. Do not mark an intern's self-test as independent signoff.
