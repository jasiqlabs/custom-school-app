# TASK-004 — Optional Aadhaar across admission and import

**Deliverable:** Students | **Requires:** none | **Decision gate:** SPEC_SYNC_REQUIRED | **Risk reviewer:** **HIGH** | **Execution status:** [single tracker](../TASK-TRACKER.md).

> This is an **implementation specification**, not a record of work completed or an already approved canonical Harness DLD. Do not change an existing route/record without verifying it against `main` and obtaining any needed Harness revision approval.

## 1. Business acceptance

**Story:** As an operator, I can admit a pupil when Aadhaar is unavailable, without entering a fake number, and may add a valid Aadhaar later.

**User journeys from requirements:** UC1: submit all other mandatory fields with blank Aadhaar: success. UC2: submit valid Aadhaar: encrypted and only last4 masked. UC3: nonblank invalid checksum: rejected. UC4: import mixed spreadsheet (blank/valid/invalid) with clear row results. UC5: previously encrypted student still displays masked last4, and update can deliberately remove Aadhaar with audit.

**Invariant and policy:** Missing Aadhaar is null, not zeroes or synthetic value. If supplied, keep existing Verhoeff checksum and encrypted profile policy. Null should be valid in manual admission, patch, import, view, TC/admission print, exports. Never reveal raw Aadhaar to report-viewer.

**Task boundary:** PRD currently says required; update canonical requirement to optional before new code. Do not create fake Aadhaar data. No later TASK service is required for this task to build, operate or be tested.

### Acceptance example / golden scenario
Manual blank admission; mixed XLSX blank/valid/bad supplied; add and remove Aadhaar later; compare previously encrypted records before and after migration; invalid supplied number 422.

## 2. DLD — Existing system & ownership

**Actual main files to inspect first:** `packages/validation/src/students/student.schema.ts`<br>`apps/api/src/modules/students/domain/student.validator.ts`<br>`apps/api/src/modules/students/application/admit-student.service.ts`<br>`apps/api/src/modules/students/application/student-import.service.ts`<br>`apps/web/src/app/operator/students/new/ui.tsx`<br>`prisma/schema.prisma`

**Domain responsibility:** Students owns the new state or coordinates via an approved public facade. All operator school IDs come from the verified server actor, Platform Admin uses its own authenticated school selector; no sibling Prisma reach-through. Shared payload validation belongs to Zod/contracts, not duplicated backend/frontend regex.

**Known current design / proposed persistence:** ALTER StudentPrivateProfile.aadhaarLast4 DROP NOT NULL; encryptedPayload schema changes to nullable aadhaarNumber with version-aware decrypt backward compatibility; preserve old fields and encryption key version. StudentPrivateProfile row can still contain other PII without Aadhaar; no unnecessary delete.

### Migration sequence (required, not optional)
1. On a disposable database seeded with **two different schools** and legacy paid/partial/void/TC records, apply an **additive** Prisma migration (nullable fields and independent tables first).
2. Verify old code paths continue to read and write without new non-null field requirements. Preserve UUID, receipt number, prior-year identity and file checksum.
3. Where historical backfill is required, use a deterministic per-school dry-run with reviewed match evidence, idempotent UPSERT/conflict semantics and explicit `UNKNOWN/UNVERIFIED` handling rather than guessing historic school data.
4. Add adapters/feature-gated cutover, compare before/after affected counts and values. Never drop an old table/field in the same feature; a rollback of *financial* production writes usually means safe roll-forward, not deleting new charges.
5. Record migration SQL, `prisma migrate status`, affected row counts and rollback/restore rehearsal for reviewer.

## 3. DLD — HTTP, authorization & public contracts

**Proposed endpoints/DTOs:** Zod studentAdmissionSchema aadhaarNumber optional/nullable/''->null, patch allows not-supplied vs explicitly null (remove) distinction. Domain validateAadhaar returns masked helper only for populated value; DTO aadhaarMasked nullable or 'Not provided' UI projection. XLSX header 'Aadhaar (Optional)', accept old template version.

**Input/output constraints:** validate school-owned UUIDs, appropriate business-date strings `YYYY-MM-DD`, concurrency/version tokens on updates, idempotency keys on retries and PII-safe read projections. Preserve all old paths/methods or implement and test a compatibility adapter; avoid forcing API changes to other working pages.

**Expected typed errors:** 401 missing/expired session, 403 unauthorized role/capability, 404 foreign-school object (avoid ID existence leak), 409 stale version/duplicate/invalid business transition, 422 invalid inputs, 503 transient file/queue/unavailable dependency. Every write remains CSRF protected and auditable.

## 4. DLD — Exact implementation sequence

1. Make StudentPrivateProfile.aadhaarLast4 nullable via additive migration; encrypted JSON payload handles missing Aadhaar independently of other encrypted PII.
2. Update admission Zod, validator, domain service, student profile edit GET/PATCH and masked view: blank/whitespace→null; nonempty Aadhaar must still pass 12-digit/checksum validation.
3. Update student import XLSX header, parser and row error DTO; preserve compatibility with old template and existing encrypted profiles.
4. Do not serialize actual Aadhaar into log/report/export; snapshots and nullable masked field must be safe on print and when null.

**Existing workflow integration:** Admission front-end remove required asterisk and blank hard check; backend validator skip only empty; safe encryption and last4 persistence conditional. Import parser old and new headers maps optional column, no error when blank, per-row error for bad supplied value; profile/edit and print components handle missing value without undefined crashes.

**Recovery and concurrency:** Treat whitespace/partial numbers as invalid if not truly blank. Masking helper must not crash on null. Sensitive data may be present in legacy encrypted import preview; keep current no-store and audit. Check PAN/bank unaffected.

**Specific safety watch:** Test encryption key versions and last4 migration with old rows, not only fresh inserts.

## 5. DLD — Frontend screen and UI state contract

- **Entry/navigation:** use the existing admin or operator screen under `apps/web/src/app`; do not replace unrelated navigation or build a dead button for a later task.
- **Render:** show correct label, values and school context from server, accessible input labels, 360/768/1366 layouts, loading/empty/error/ready/success states, and a short human-readable reason for 409/422.
- **Write UX:** validate before submit, prevent accidental double-submit and stale overwrite, retain form data on recoverable error, refresh server state on successful save and provide clear next action.
- **Preserve existing FE:** rerun impacted routes before/after any redesign; a different layout is permitted but previously working actions, link targets, permissions and print behavior must still work.
- **Source-backed UI checks:** TASK-004-FE01 Admit student with no Aadhaar using manual form; FE02 valid Aadhaar accepted/masked and invalid nonempty rejected; FE03 edit student to add/remove Aadhaar without profile crash; FE04 mixed XLSX rows (blank/valid/invalid) with row-level error workbook and old template support; FE05 admission form/TC print and directory with null safe display; FE06 actual mobile/tablet/desktop validation and field label.

## 6. Test cases — FE, BE, NFR (record evidence; not just checkboxes)

**Frontend acceptance tests:** TASK-004-FE01 Admit student with no Aadhaar using manual form; FE02 valid Aadhaar accepted/masked and invalid nonempty rejected; FE03 edit student to add/remove Aadhaar without profile crash; FE04 mixed XLSX rows (blank/valid/invalid) with row-level error workbook and old template support; FE05 admission form/TC print and directory with null safe display; FE06 actual mobile/tablet/desktop validation and field label.

**Backend unit/API/database tests:** TASK-004-BE01 null DB constraint; BE02 old decryption unchanged; BE03 422 for malformed supplied value; BE04 encrypted field never in directory or logs; BE05 duplicate import retry doesn't change identity; BE06 mixed XLSX error report.

**NFR, security, load and recovery tests:** TASK-004-NFR01 PII redaction/security audit; NFR02 5k rows bounded import; NFR03 old encrypted profile upgrade test; NFR04 no loss of last4 or masking during migration.

**Test environment:** synthetic School A and B; fresh and existing records; valid/invalid IDs; MANAGER, Platform Admin and REPORT_VIEWER when implemented. Capture exact request/response/error snapshots, UI screenshots and timings *before and after*. All status is tracked in the single tracker, not here.

**Mandatory old-function regression:** BASE-06,07,08,14,16. Re-run old login/session rules, class/student admission/search/import, monthly fee generation/pay/void/receipt, transports, dashboard/report exports, platform TC and private files **where touched**. See [REGRESSION-BASELINE](../REGRESSION-BASELINE.md).

## 7. Deployment & Definition of Done

- Task builds/deploys with **only listed completed predecessors**, no assumptions on later task IDs.
- Changed schema and API are compatible with old data/clients, with durable audit/CSRF/tenant isolation.
- New FE/BE/NFR cases and impacted BASE tests executed and actual logs/screens/metrics linked; old journeys not broken.
- Reviewer approves any intentional behavioral replacement and risky migration (senior review on auth, PII, fees, academic migration, documents).
- `git diff --check`, targeted/full tests, browser walkthrough, API integration, environment baseline and rollback plan are recorded.
- **Only then** reviewer updates [TASK-TRACKER.md](../TASK-TRACKER.md) to DONE after approved integration. Do not mark an intern's self-test as independent signoff.
