# TASK-004 — Optional Aadhaar across admission and import

**Deliverable ownership:** Students. **Explicit completed predecessors:** none. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Nullable Aadhaar across manual admission, edit, XLSX import, masked views and crypto storage. Existing encrypted values must remain decryptable; nonempty invalid Aadhaar rejected.

**Not part of this task:** Do not add fake placeholder Aadhaar or drop encrypted legacy data.

## 2. Functional requirement, users and acceptance journeys

**User story:** As an operator, I can admit a pupil when Aadhaar is unavailable, without entering a fake number, and may add a valid Aadhaar later.

**School use cases / required results:** UC1: submit all other mandatory fields with blank Aadhaar: success. UC2: submit valid Aadhaar: encrypted and only last4 masked. UC3: nonblank invalid checksum: rejected. UC4: import mixed spreadsheet (blank/valid/invalid) with clear row results. UC5: previously encrypted student still displays masked last4, and update can deliberately remove Aadhaar with audit.

**Rules, permissions and policy boundaries:** Missing Aadhaar is null, not zeroes or synthetic value. If supplied, keep existing Verhoeff checksum and encrypted profile policy. Null should be valid in manual admission, patch, import, view, TC/admission print, exports. Never reveal raw Aadhaar to report-viewer.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** ALTER StudentPrivateProfile.aadhaarLast4 DROP NOT NULL; encryptedPayload schema changes to nullable aadhaarNumber with version-aware decrypt backward compatibility; preserve old fields and encryption key version. StudentPrivateProfile row can still contain other PII without Aadhaar; no unnecessary delete.

**API contract, validation and status/errors:** Zod studentAdmissionSchema aadhaarNumber optional/nullable/''->null, patch allows not-supplied vs explicitly null (remove) distinction. Domain validateAadhaar returns masked helper only for populated value; DTO aadhaarMasked nullable or 'Not provided' UI projection. XLSX header 'Aadhaar (Optional)', accept old template version.

**Backend/service algorithm, module/public facades and FE binding:** Admission front-end remove required asterisk and blank hard check; backend validator skip only empty; safe encryption and last4 persistence conditional. Import parser old and new headers maps optional column, no error when blank, per-row error for bad supplied value; profile/edit and print components handle missing value without undefined crashes.

**Failures, concurrency, idempotency and edge cases:** Treat whitespace/partial numbers as invalid if not truly blank. Masking helper must not crash on null. Sensitive data may be present in legacy encrypted import preview; keep current no-store and audit. Check PAN/bank unaffected.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** TASK-004-FE01 Admit student with no Aadhaar using manual form; FE02 valid Aadhaar accepted/masked and invalid nonempty rejected; FE03 edit student to add/remove Aadhaar without profile crash; FE04 mixed XLSX rows (blank/valid/invalid) with row-level error workbook and old template support; FE05 admission form/TC print and directory with null safe display; FE06 actual mobile/tablet/desktop validation and field label.

**Backend BE cases:** TASK-004-BE01 null DB constraint; BE02 old decryption unchanged; BE03 422 for malformed supplied value; BE04 encrypted field never in directory or logs; BE05 duplicate import retry doesn't change identity; BE06 mixed XLSX error report.

**Nonfunctional NFR cases:** TASK-004-NFR01 PII redaction/security audit; NFR02 5k rows bounded import; NFR03 old encrypted profile upgrade test; NFR04 no loss of last4 or masking during migration.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
