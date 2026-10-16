# TASK-003 — Official school identity fields and configuration

**Deliverable ownership:** School. **Explicit completed predecessors:** none. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

School UDISE, School Code and Affiliation Number are nullable school-level strings. Persist and expose via approved School facade to upcoming printed documents; preserving existing School.id identity.

**Not part of this task:** This task does not change student UDISE fields or PDF templates; those are separately deployable changes.

## 2. Functional requirement, users and acceptance journeys

**User story:** As platform administrator, I enter the school's official identifiers once at the school level, without asking each student to enter the school UDISE again.

**School use cases / required results:** UC1: new school stores UDISE 00001234567 and displays its leading zeroes. UC2: existing school adds affiliation number without overwriting principal. UC3: school with absent identifiers continues using current ERP while profile shows missing values. UC4: wrong tenant cannot edit another school.

**Rules, permissions and policy boundaries:** Codes are school-level strings; preserve leading zeroes/case where relevant. Optional until client confirms mandatory status/validation and jurisdiction; no unapproved format constraints. Apply optimistic school version to edits and audit who changed identifiers.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** Add nullable School.udiseNumber varchar(32), schoolCode varchar(64), affiliationNumber varchar(64) with CHECK length by validator, no blanket unique until approved; migrate additive. Preserve School.id UUID; no relation to old Student.udiseCode except deprecation FB-03.

**API contract, validation and status/errors:** Extend existing POST/PATCH/GET /platform/schools and school detail DTOs, Zod inputs; expose safe school identity read facade to Students print/TC document owners. PATCH requires {version}; on stale return 409.

**Backend/service algorithm, module/public facades and FE binding:** Admin school create/profile form labeled 'School UDISE Number', 'School Code', 'Affiliation Number'; ability to clear/save; normalized trimmed inputs with no numeric coercion; document consumers use frozen issuance snapshot, not dynamic lookup each print.

**Failures, concurrency, idempotency and edge cases:** Legacy tenants lacking values should render em dash, not invented defaults. School identifiers are business codes not hard security IDs; use UUID for authorization.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** TASK-003-FE01 create school with all three codes and leading zeroes; FE02 edit, clear and reload; FE03 unset code displays neutral 'Not provided'; FE04 length validation and responsive profile; FE05 no school profile/branding regression.

**Backend BE cases:** TASK-003-BE01 migration on populated school; BE02 version conflict; BE03 admin-only mutation; BE04 safe GET tenant selection; BE05 no loss of school name/logo/principal.

**Nonfunctional NFR cases:** TASK-003-NFR01 additive zero downtime migration; NFR02 audit metadata without unnecessary identifier duplication; NFR03 indexed existing school query unaffected; NFR04 privacy/no-store policies.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
