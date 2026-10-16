# TASK-005 — Remove student UDISE control and print school identity on admission form

**Deliverable ownership:** Students / School. **Explicit completed predecessors:** TASK-003. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Remove misleading student-level UDISE form control; preserve Student.udiseCode legacy storage; print three school identifiers on the operator admission form with graceful nullable display.

**Not part of this task:** No TC PDF rendering in this task. TC header/issuance snapshot integration is TASK-029. Must be complete without TASK-029.

## 2. Functional requirement, users and acceptance journeys

**User story:** As a school operator, I stop entering the school's UDISE number on individual students and obtain accurate official identifiers on admission printouts.

**School use cases / required results:** UC1: admit a student without student UDISE field; admission still succeeds. UC2: print admission form for school with all three identifiers and verify exact leading zeros. UC3: old school lacks affiliation number; form prints 'Not provided', no crash. UC4: existing Student.udiseCode remains in DB and old API client can read it during deprecation.

**Rules, permissions and policy boundaries:** School identifiers are sourced solely from SchoolInfoPublicFacade; data migration is additive and no legacy student UDISE column is dropped. Admission printed year/class comes from Students enrollment read snapshot, not dynamically guessed from today's class.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** No breaking Student column drop; keep Student.udiseCode nullable as legacy/deprecated. Extend AdmissionFormPrintDto.school with udiseNumber, schoolCode, affiliationNumber; null-safe school read model via School facade. No TC table/file change.

**API contract, validation and status/errors:** Existing GET /operator/students/:id/admission-form returns additional optional school identity fields. Student admission POST/PATCH allow legacy optional udiseCode for compatibility but new web form does not submit it; server ignores/archives according to approved migration decision. Never treat submitted student UDISE as school ID.

**Backend/service algorithm, module/public facades and FE binding:** Update apps/web/src/app/operator/students/new/ui.tsx to remove field+binding, including accessibility/validation; update SearchStudentsService.getAdmissionFormPrint via SchoolInfoPublicFacade and operator print UI to show codes in school header. Use A4 print CSS, bounded long lines. Deploy after TASK-003, no references to TC worker.

**Failures, concurrency, idempotency and edge cases:** Old admission data may contain student UDISE; preserve it; never migrate it automatically to School fields. Cross-school printed school identity must be resolved by authenticated actor school; old API clients unaffected.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** FE01 form no student UDISE; FE02 A4 admission school codes including leading zeros; FE03 optional empty identifiers and long addresses; FE04 360/768/1366 + print styles.

**Backend BE cases:** BE01 Student legacy UDISE still readable; BE02 school identity from session/School facade, not student request; BE03 cross-school ID 404; BE04 existing admission payload remains supported; BE05 history print session/class correct.

**Nonfunctional NFR cases:** NFR01 two-school PII/IDOR tests; NFR02 print PDF text extraction + 25-char codes; NFR03 zero migration deletion; NFR04 performance and no-store.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
