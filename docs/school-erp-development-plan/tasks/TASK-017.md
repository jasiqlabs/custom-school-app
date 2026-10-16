# TASK-017 — Books and uniform selection during admission

**Engineering owner:** Admission / Fees. **Only technical predecessors:** TASK-016 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Provide optional Books/Uniform fee selections and server-priced charges in admission preview/confirmation, persisted as fee categories and visible in fees statement.

**Explicitly out of this task:** No Books/Uniform inventory, supplier, procurement, delivery or separate management UI.

**Operator/user story:** School operator selects Books and/or Uniform during admission, can show their cost in fee statement, without tracking stock, quantities or suppliers unless separately approved.

**Use cases with success/error expectations:** UC1: selects Books only, preview and created dues show Books charge. UC2: selects Books+Uniform, two independent fees; UC3: deselect both, no charges. UC4: student cannot trigger extra fee by submitting a fake low amount; server recalculates from rule. UC5: correct error without duplicate student after network timeout.

**Domain rules and acceptance:** No Books/Uniform inventory, distribution, purchasing, vendor or stock dashboard. Only optional charge selection and posting at admission. Whether items are per-school per-session or one-time and whether amount override allowed must be explicitly decided.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** FeeCharge sourceKey school+student+category+admissionEventID; reference `FeeRuleId` and snapshot amount, no product SKU or inventory table. AdmissionSelection snapshot for audit records chosen category codes, not a permanent inventory entitlement.

**Typed endpoints and cross-domain facade contracts:** Student POST admission accepts optional `chargeSelections: ['BOOKS','UNIFORM']` only (or rule IDs validated school-side); GET /operator/students/admission-fee-options?classId&academicSessionId supplies configured amount and labels; server posts charges via Fees facade.

**Detailed service orchestration, server algorithm and frontend states:** Admission wizard section toggles with labeled configured prices; live review shows tuition + initial charges and any transport selection separately. On confirm, Students service validates school/class/session and requests FeesPublicFacade.postInitialCharges with source event; creates independent charges as configured; show receipt only after actual payment.

**Recovery, idempotency, edge/race cases:** Changing selection after paid billing needs adjustment/refund business rule, not deleting historical fee. Do not infer books delivered from fee paid. More than one admission in different year obeys approved one-time policy.

## 3. Specific FE, BE and NFR tests

**FE:** TC-FE04-FE01 books/uniform none/one/both; FE02 preview amounts from server; FE03 wrong rule no fake negative total; FE04 slow network retry; FE05 small viewport checkbox accessible.

**BE/DB/API/security:** TC-FE04-BE01 wrong-school fee rule 404; BE02 backend amount authority; BE03 duplicate POST dedupe; BE04 student import pathway parity if selected; BE05 no inventory table or side effects; BE06 generated bill itemized.

**NFR/operations:** TC-FE04-NFR01 bounded admission latency; NFR02 audit and private billing state; NFR03 no workflow failure caused by absent optional rule; NFR04 no repeated category charge after retry.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Functional workflows and all named FE/BE/NFR tests pass with reviewer approval, migration verification and explicit rollback procedure. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
