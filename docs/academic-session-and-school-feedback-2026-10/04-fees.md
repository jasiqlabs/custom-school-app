# Fees Extension: Categories, Arrears, Concessions and Payment Ledger

**Source:** additional client requests 3–7. **Risk:** This is a substantial BE/DB change, not a few dropdown additions. Existing `FeeDue` is unique by student/month, and each `FeePayment` has exactly one `dueId`. Maintain old data/receipts without financial changes.

## FE-01 — Fee categories and configurable charge rules (P0)

**Requirement.** Support named **Registration, Admission, Monthly/Tuition, Transport, Exam, Late, Books, Uniform, Others** fees; school can configure amount and applicability, and select a category while recording/collecting. Distinguish recurring, one-time, periodic, and manual charges.

**DLD.**
- Add school-scoped `FeeCategory` code, displayName, active flag, kind and `FeeRule` (class/session applicability, amount, dueDate, recurrence, effective dates, version). Seed built-in category **codes**, not immutable hard-coded amounts or user-created purposes; `OTHERS` is configurable with descriptive label.
- Provide manager-only `GET/POST/PATCH /operator/fees/categories`, `GET/POST/PATCH /operator/fees/rules`; read-only role has only report endpoints.
- Keep `ClassFeeConfig` for old monthly charges during migration; map into new rules with explicit transitional adapter, then phase out writes when verified.
- Web fee setup UI lists category, label, amount, one-time/monthly/manual, per-class/session toggle, status; do not couple to Transport module charges until clarified.

**Acceptance.** Multiple independent fee types can coexist for one student/month; configured fee rules never silently rewrite paid historical charges.
**FE tests.** Create/edit/list/disable rules; search; validation (negative/large amount, invalid dates), graceful empty state; mobile/desktop.
**BE tests.** Uniqueness per school/code, read-only denial, duplicate rule handling, version conflicts, tenant isolation, deactivated rule retains existing debt.
**NFR tests.** Indexed rule lookup, config cache invalidation, audit and rate limiting, migration rollback.

## FE-02 — One-time registration and admission fees (P0)

**Requirement.** At admission, eligible students are charged Registration Fee and Admission Fee **once**, when configured. User can see these as separate lines, including paid/unpaid/waived.

**DLD.** Define one-time business keys `(schoolId,studentId,chargeKind,chargePolicyScope)` to block duplicates under retries; scope policy (once per student at school vs every new admission) in decision log. Idempotent `CreateInitialCharges` called from admission service, with transaction/outbox pattern if it crosses module boundary. No charge when category disabled or school has no rule. Add admission financial preview and detail in student profile.
**FE tests.** Add student with 0/1/2 configured one-time charges, payment later, admission retry, validation messages.
**BE tests.** Same idempotency key, parallel admission requests, duplicate prevention, amount snapshot, disabled rule, bad school/student scope.
**NFR tests.** Admission still responsive; safe retry after partial DB failure; no unbounded external calls.

## FE-03 — Transport/exam/late/other fees (P1)

**Requirement.** Allow school to collect Transport Fee, Exam Fee, Late Fee and Other charges. Charging cadence differs: transport might recur, exam may be per exam/term, late might be conditional, 'Other' is ad hoc.

**DLD.** Use FE-01 category/rule + FE-07 charge ledger. `Transport` optional rule must be linked to **active transport assignment** only after confirming policy. Exam charges require a named assessment/term label (without inventing full exam module). `Late` fees should be **manual or approved-rule** until trigger/grace-rate policy is provided; never start automatic fines without agreement. Other fee requires description and approved manager input.
**FE tests.** Different category frequency, one-off charge, transport assignment on/off, custom label, no double assessment fee.
**BE tests.** Charge basis key uniqueness, disabled category, manual amount authorization, partial/void and audit, tenant IDs.
**NFR tests.** Bulk monthly evaluation avoids N+1, asynchronous retry idempotency, invoice/report retrieval speed.

## FE-04 — Books and uniforms during admission, without inventory (P1)

**Requirement.** Optional checkboxes or selection fields **Books** and **Uniform** during student admission, with applicable fee amount immediately displayed in fee section. No stock/inventory, distribution, vendor, SKU or purchasing module.

**DLD.** Extend admission request as optional `selectedAdmissionCharges: [{categoryCode:'BOOKS'|'UNIFORM', configuredRuleId?, agreedAmount?}]` with validated school-scoped configs and server-computed amounts, not client-trusted totals; call FE-02 charge creator. Show financial review before final admission and resulting fee dues. Changes after admission are audited add/remove/waiver adjustments, not deleting paid charges. No separate navigation items for inventory.
**FE tests.** None/books/uniform/both; fee preview and final balances; failure preserves form draft; new profile reflects charges.
**BE tests.** Server amount verification, missing config, concurrency, student created once, idempotent charge creation, no invalid deductions on payment.
**NFR tests.** Minimal extra DB calls during admission; responsive validation; no storage/inventory side effects.

## FE-05 — Carry forward previous-month pending amounts (P0)

**Requirement.** When current month fees are due, show unpaid amounts from **every** previous month along with current month. Distinguish months and fee categories. Paying prior dues reduces original due only. Carryforward is a **display/reconciliation** action, not creating duplicate charges.

**Example.** August tuition ₹700, paid ₹200 → ₹500 pending. September tuition ₹700 → payment screen: August arrears ₹500 + September ₹700 = **₹1,200 outstanding**. Collect ₹600 oldest-first (if approved) → August ₹0, September ₹600. No new ₹500 fee record is created.

**DLD.**
- Introduce arrears aggregate endpoint `GET /operator/fees/students/:id/statement?academicSessionId=` using FE-07 charge lines and allocations with `dueDate<=today` and per-period ordering. Return `previousOutstanding`, `currentCharges`, `totalOutstanding`, per-line status.
- Current `ensureDuesForApplicableMonths` creates **current** + possibly **admission month** only; implement idempotent intermediate-month generation for each eligible month bounded by admission/session/fee-rule effective dates; use cursors or job for old data, never retrospectively charge without preview.
- Oldest-first allocation policy is proposed but **unconfirmed**; UI lets manager select lines if client wants manual ordering. No silent interest, penalties or balance duplication. Include previous-session arrears from AS-05.
- Pending-fees report should expose as-of-date outstanding and category/month breakdown; keep old monthly report endpoint as compatibility adapter during rollout.

**FE tests.** 1–12 unpaid months, partial payment, no prior arrears, payments spanning many months, refresh after void, clear and correct example sums.
**BE tests.** Query all months, not current only; idempotent missed-month repair; start-date rule, repeat scheduler no duplicates, old/new sessions, partial/void flows, all balances reconcile.
**NFR tests.** Query plans over 5k students/school and multi-year ledger; batch backfill progress and rollback; deterministic rounding.

## FE-06 — Concession description/reason (P1)

**Requirement.** When school grants a fee concession, add optional/required-when-positive **Description / Reason** field, available during admission and student fee-concession edit, while retaining percentage and fixed-amount choices.

**DLD.** Add nullable `concessionReason` to `Student` and reason snapshot on affected `FeeCharge`/due (exact table follows FE-07); Zod max length, trim and control characters; detect changed concessions, do not retroactively alter fully paid charges. Existing `syncStudentConcessionDues` adjusts pending dues: preserve its safety constraints and account for multiple fee categories. Default concession to **tuition only** pending decision; do not discount books/uniform/fines automatically. Audit reason edits without leaking medical/personal remarks into public receipts by default.
**FE tests.** Description visible for fixed/percent, correct cleared state for NONE, edit reason, required prompt if chosen by client, amount calculations.
**BE tests.** Max length / sanitization, historical snapshots, paid charge immutability, concurrent update, null legacy records, audit.
**NFR tests.** Sensitive free-text PII minimization, safe CSV/XLSX export escaping, no performance regression.

## FE-07 — Multi-line charge & payment-allocation foundation (P0; technical enabler)

**Requirement.** One student can owe multiple fee categories/months and pay part or all in one transaction/receipt; totals remain exact across void, retry and historical session transition.

**DLD.**
1. Add `FeeCharge` (schoolId,studentId,academicSessionId?,categoryId,ruleId?,periodKey?,dueDate,sourceKey,baseAmount,concessionSnapshot,netAmount,paidAmount,balance,status,version,createdAt), unique `(schoolId,sourceKey)`. Store monetary values as Decimal(12,2) or integer minor units, never JS float for ledger postings.
2. Add `FeePaymentAllocation(paymentId,chargeId,amount)`; unique per payment/charge or explicit allocation sequence. Reuse `FeePayment` receipt identity/idempotency/audit; initially keep old `dueId` for legacy payments and permit nullable only after readers adapted. Add a transitional adapter for existing FeeDue records; avoid mixed double-count reports.
3. `POST /operator/fees/payments` should accept validated `allocations:[{chargeId,amount}]` under a new explicit contract, preserving existing single-due request in compatibility mode. Lock selected charge rows in stable order; verify balances and school/student IDs; allocate receipt number once; write payment+allocations+balances+audit atomically.
4. For void: reverse allocations within locked transaction, preserve original payment/receipt, mark VOIDED, never delete; no refactoring of old void semantics without regression tests.
5. Backfill existing due/payment/allocation data **in shadow tables** with mapping IDs; deploy dual-read reconciliation and compare totals before switching writes. Avoid re-generating all fees from class rules as backfill, because that may change historical financial facts.
6. `PaymentReceiptDto` must include frozen charge line labels, period, amounts and collected-by details while still responding to old clients. Keep all existing PaymentHistory searches and receipt numbers stable.

**FE tests.** Choose multiple lines, collect exact total, partial allocation, invalid overpayment inline, refresh showing correct remaining, void and old receipts.
**BE tests.** Concurrency on same charge, idempotency replay, unique receipt numbers, Decimal rounding, failed transaction rollback, charge cross-school, wrong student, duplicate allocations, old `FeeDue` read compatibility, reconciliation equality.
**NFR tests.** Transaction p95 measured under agreed load, DB deadlock recovery, high-volume backfill in chunks, backup/restore test, financial invariants monitored (sum allocation = active payment; net = paid + balance), read-only exports don't lock ledger.

---

## Required rollout order for fees

**First:** FE-07 design and reconciliation contract, FE-01 category model → **then:** FE-02/04 initial charges, FE-05 arrears, FE-03 other categories, FE-06 concession scope, FB-05/06 receipts. Receipt templates and debt-clearance rules must use **the same authoritative financial statement service**, not duplicate sum logic.
