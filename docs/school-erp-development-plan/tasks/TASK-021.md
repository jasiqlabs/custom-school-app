# TASK-021 — Academic-year financial continuity and reconciliation

**Engineering owner:** Fees. **Only technical predecessors:** TASK-013, TASK-019 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Carry genuine previous-session unpaid charges forward into the current collection statement without duplicating them or rewriting the original year. New-year new fee obligations are separate charges.

**Explicitly out of this task:** This service is complete using existing year, fee, statement ports and must not depend on future promotion TASK-024 or year close TASK-025. They will consume this stable facade.

**Operator/user story:** As a manager, I start a new academic year without losing previous fee balances or double-charging a student.

**Use cases with success/error expectations:** UC1: 2026–27 old ₹400 unpaid and 2027–28 ₹900 tuition -> statement ₹1300 with original origin sessions. UC2: pay ₹400 in 2027–28, old charge closes, new remains. UC3: closed year report still shows as-of-close outstanding vs today's remaining, clearly labelled. UC4: previous paid receipts remain immutable.

**Domain rules and acceptance:** Carry genuine previous-session unpaid charges forward into the current collection statement without duplicating them or rewriting the original year. New-year new fee obligations are separate charges.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** FeeCharge.originSessionId UUID FK, servicePeriod start/end/date and immutable billed amount. FeePaymentAllocation appliedOn timestamp and optional collectionSessionId as contextual metadata. SessionCloseSnapshot aggregate counts/hash generated from fee facade for frozen as-of reporting, not source of truth for live balances.

**Typed endpoints and cross-domain facade contracts:** FeesPublicFacade.getStatement({schoolId,studentId,asOfDate,includeClosedSessions:true}); GET /operator/fees/statements/:studentId?academicSessionId; GET /operator/academic-sessions/:id/closing-financial-summary. Response splits originSession, chargePeriod, paid/outstanding.

**Detailed service orchestration, server algorithm and frontend states:** Fees owner builds SQL over ledger with session filter, allocations, and cutoffs. Academics close-preview calls fees facade only, never fee tables. Web statement groups older-session arrears separately, total remains sum of source charge balances. Receipts always use payment-time source allocation snapshots.

**Recovery, idempotency, edge/race cases:** What happens when prior balances legally written off or conceded requires explicit adjustment with actor/reason, not direct status PAID. Financial-year numbering is a separate CL-06 policy.

## 3. Specific FE, BE and NFR tests

**FE:** TASK-021-FE01 older/newer session statement correct; FE02 receipt after old-fee payment identifies year; FE03 close preview shows arrears vs locked snapshots; FE04 no double charge in category cards.

**BE/DB/API/security:** TASK-021-BE01 strict arithmetic invariant; BE02 no duplicate charge after close/create; BE03 partial + void on historic charge; BE04 cross-year assignment joins school safe; BE05 no direct student table access in fees.

**NFR/operations:** TASK-021-NFR01 24–60 months ledger query plan; NFR02 stress 10 parallel mixed-year payments; NFR03 daily reconcile alerts; NFR04 restore test with old charge snapshots.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Functional workflows and all named FE/BE/NFR tests pass with reviewer approval, migration verification and explicit rollback procedure. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
