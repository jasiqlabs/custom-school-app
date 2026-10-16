# TASK-015 — Concession reasons and non-destructive adjustments

**Engineering owner:** Students / Fees. **Only technical predecessors:** TASK-013 (all lower numbers). **One execution status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **DLD:** Proposed for official Harness approval.

## 1. Business outcome and use cases

**Deliver this complete, compatible capability now:** Capture auditable concession reason and define exact category eligibility; never silently recompute or modify an issued receipt or paid charge.

**Explicitly out of this task:** Do not implement unapproved medical/sensitive reason in receipts. Resolve current code recalculating pending due contrary to approved DLD by append-only adjustments or prospective rule and migration.

**Operator/user story:** Operator can record why a fixed or percentage discount was offered and auditors can see when it was granted without unexpectedly changing paid history.

**Use cases with success/error expectations:** UC1: ₹900 tuition 10% scholarship for merit; reason saved with student and future charge. UC2: concession NONE clears active reason if chosen but old paid charges keep original concession snapshot. UC3: school grants new concession after August paid; August receipt unchanged and September follows rule. UC4: authorized retrospective correction posts a separate signed adjustment event, never rewrites an original receipt.

**Domain rules and acceptance:** Client decides required vs optional reason, whether discounts apply tuition only or all fee categories, and whether historical correction permitted. Preserve original type/value and unchanged paid invoice/receipt snapshots; code currently mutates pending due on profile change contrary to approved DLD. Must resolve via PRD/DLD governance, not simply extend mutation.

## 2. Implementation-ready DLD proposal

**Persistence objects, migrations, indexes and invariants:** Student.concessionReason nullable text max approved length, concessionPolicyVersion?; snapshot FeeCharge.concessionType,concessionValue,concessionAmount,reason? with private note separation; FeeAdjustment(id,chargeId,schoolId,amountDelta,reason,actorId,kind,state,createdAt) append-only with effective-date. Index student/charge and event audit.

**Typed endpoints and cross-domain facade contracts:** Student PATCH /operator/students/:id extends concession {type,value,reason?} with explicit NONE rules; GET student profile returns authorized reason; FeePublicFacade.previewConcessionChange returns affected future periods and optional adjustments. Validation of %<=100, discount not exceeding gross, sanitization.

**Detailed service orchestration, server algorithm and frontend states:** Manager edits concession in student profile, state shows current/forward effect; Students owns student-level preference via facade, Fees owns assessment/adjustment and recalculation where approved. Fees calculator uses exact decimal round-half-up, category applicability from approved policy, writes frozen reason snapshot on assessed charge. UI labels Description/Reason with helper.

**Recovery, idempotency, edge/race cases:** Old data has null reason; do not force migration fill. Private free text may contain protected data; restrict display to authorized manager and audit reason edits; never auto-print sensitive reason on public receipt unless agreed.

## 3. Specific FE, BE and NFR tests

**FE:** FE01 successful create/view, FE02 error validation, FE03 manual retry, FE04 responsive 360/768/1366 and WCAG keyboard/contrast.

**BE/DB/API/security:** Manager edits concession in student profile, state shows current/forward effect; Students owns student-level preference via facade, Fees owns assessment/adjustment and recalculation where approved. Fees calculator uses exact decimal round-half-up, category applicability from approved policy, writes frozen reason snapshot on assessed charge. UI labels Description/Reason with helper.

**NFR/operations:** NFR01 benchmark p95 for 500/5000 students with 24 months, NFR02 non-destructive backfill and recovery, NFR03 protected PII and reports, NFR04 job/worker restart.

## 4. Deployment-safe compatibility and DoD

This task is **not waiting on a later task**. Any later integration is a separately deployable optional facade call; existing user flows and jobs remain functional with a safe default even when later features do not exist. No code must invoke unfinished later service/route; hide unready CTA rather than linking to it.

**Compulsory regressions:** operator/admin auth, student manual/XLSX admission, search/profile, existing class monthly fee generation, part/full collection and same-day void, receipt history, transport current/service dates, platform-admin TC, dashboard and financial exports (as applicable). Record before/after monetary totals on representative 2-school fixtures. No direct another-module Prisma calls in newly written code; privacy, CSRF, signed storage and audit preserved.

**Definition of done:** Approved discount scope and historical correction strategy; FE/BE NFR and financial snapshots prove old records preserved. An independent reviewer must see proof and update [TASK-TRACKER](../TASK-TRACKER.md) with PR/commit, owner, FE/BE/NFR artifacts and release status before marking DONE. Attach reproducible commands, screenshots, timings, PR SHA and reviewer sign-off to the **single [tracker](../TASK-TRACKER.md)**; specifications are not implementation evidence.
