# TASK-012 — Fee category definitions and effective billing rules

**Deliverable ownership:** Fees. **Explicit completed predecessors:** TASK-007. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

Introduce school-scoped configuration for registration/admission/tuition/transport/exam/late/books/uniform/others, including cadence, effective ranges and class/session targeting.

**Not part of this task:** Keep existing ClassFeeConfig and old monthly fee generation operational until TASK-013 ledger conversion; do not expose enabled multi-fee charge writers prematurely.

## 2. Functional requirement, users and acceptance journeys

**User story:** A school manager configures monthly tuition plus registration, admission, transport, exam, late, books, uniform and 'other' charge rules without manually editing databases.

**School use cases / required results:** UC1: create registration rule ₹500 one-time and tuition ₹900 monthly; UC2: add exam fee ₹300 per approved term; UC3: edit fee rule for future period without changing paid old charges; UC4: disable fee category but historical balance remains visible. UC5: same school two classes have different tuition.

**Rules, permissions and policy boundaries:** Fee category is classification, fee rule controls who/when/how much; school-scoped configurable amounts and labels. Original monthly model must remain compatible. Category uniqueness by normalized code; no hardcoded charge amounts. Auto late fee forbidden without policy approval. Book/uniform not inventory.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** FeeCategory(id UUID,schoolId,code,displayName,chargeKind ONE_TIME|RECURRING|EVENT|MANUAL,status,version); FeeRule(id,schoolId,categoryId,academicSessionId?,classId?,amount numeric(12,2),effectiveFrom,validUntil?,recurrencePolicy,paymentDueOffset?,version,status); check amount>=0 for optional waiver and >0 for active billed rule per approved policy; UNIQUE school/category normalized code; indexed school,class,session,date. Legacy ClassFeeConfig mapped in compatibility read adapter.

**API contract, validation and status/errors:** GET/POST/PATCH /operator/fees/categories, GET/POST/PATCH /operator/fees/rules with positive amount Zod, dates/year restrictions, role manager; GET list full rule projections for FE; 422 invalid recurrence/currency, 409 stale version/dup, 404 tenant conflict.

**Backend/service algorithm, module/public facades and FE binding:** Fees module owns rule resolution: choose one applicable rule by school+session+class+category+effective date, handle override precedence explicitly; billing engine FE-07 creates idempotent charge sourceKey; UI Fee Setup tab categories+rules, activate/deactivate with preview of who will be affected; dashboard aggregates through FeesPublicFacade.

**Failures, concurrency, idempotency and edge cases:** Class/month rate change retroactivity must obey approved DLD frozen due snapshots; do not silently recalculate paid or prior generated due when editing rule. Safe path is adjustment with reason and audit if approved. Multiple event charges in same month should coexist without overwriting each other.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** TC-FE01-FE01 category Create/Edit/Disable; FE02 list amount/cadence/target class; FE03 duplicate and bad effective range; FE04 old monthly rule still displayed; FE05 responsive table and accessible select.

**Backend BE cases:** TC-FE01-BE01 school-category unique concurrency; BE02 effective selection precedence; BE03 role and tenant denied; BE04 old ClassFeeConfig adapter equals previous effective rate; BE05 disabled rule no new charge, old dues persist; BE06 audit change.

**Nonfunctional NFR cases:** TC-FE01-NFR01 rule lookup index plan 5k students x 9 categories; NFR02 backfill reversible; NFR03 rate update no N+1; NFR04 zero old fee financial variance.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
