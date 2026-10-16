# Formal Reconciliation — Prior Academic Session Research vs Current Tasks

**Primary source reviewed:** user-provided `School_Management_SaaS_Requirement_Clarifications.pdf`, six pages, titled “GET DIGITAL YOUR SCHOOL | REQUIREMENT CLARIFICATION NOTE”. The PDF contains **10 questions** on pages 2–4 and a **client decision matrix with NO selected choices on page 6**. As a result, those 10 items are *research/clarifications*, **not proven client-approved scope**. Every requirement below remains subject to CURRENT / NEXT_PHASE / NOT_REQUIRED confirmation.

**Prior change set:** 26 tasks (AS 6, FB 8, FE 7, DC 5). The earlier register addressed research entries 1,2,3,10 well and 5 partially, **but did not individually cover** entries 4,6,7,8,9 nor full mid-year billing class/exit decisions. Added 6 tasks `CL-01..CL-06` to prevent invisible scope omissions; total now **32 tasks**. Avoid treating the extra tasks as accepted paid work without approval.

## Ten clarification records, verbatim topic alignment and design disposition

| Source ID | PDF page | Original topic | Earlier status | Aligned task(s) now | Key must-not-miss use case / architectural acceptance | Client decision |
|---|---|---|---|---|---|---|
| PDF-01 | 2 | Academic Year / School Session | AS-01/02/03 | **AS-01, AS-02, AS-03, AS-05, AS-06** | School-local start/end, one ACTIVE, session-owned class/fee/report; no auth session confusion | NOT CONFIRMED |
| PDF-02 | 2 | Year-End Promotion / Repeat / Pass-Out | AS-04 | **AS-04, CL-01** | Promote/repeat/change section/graduation/leaving with no duplicated Student UUID, audited exception | NOT CONFIRMED |
| PDF-03 | 2 | Closing an Academic Year | AS-02 | **AS-02, AS-05** | Closed records stable, deliberate audited corrections, outstanding debts retained | NOT CONFIRMED |
| PDF-04 | 2 | Student Leaving / TC / Pass-Out Lifecycle | Partial DC-01/02 | **CL-01 (NEW), DC-01, DC-02, CL-02, CL-04** | Leaving date, future tuition/transport end, TC policy and leaving-without-TC | NOT CONFIRMED |
| PDF-05 | 3 | Fee Start / Stop for Mid-Year Admission or Leaving | Partial AS-05 and FE-05 | **CL-02 (NEW), FE-01, FE-03, FE-05, AS-05** | August admission not billed April-July, leave stops future months; mid-year class fee change policy | NOT CONFIRMED |
| PDF-06 | 3 | Mid-Year School Onboarding / Opening Balances | MISSING | **CL-03 (NEW), FE-07, AS-01** | Existing school fee debt/paid history migrated with provenance and zero double counting | NOT CONFIRMED |
| PDF-07 | 3 | Student Reactivation / Re-Admission | MISSING | **CL-04 (NEW), AS-03, CL-02** | New period/class/section chosen and previous history kept; no fresh Student identity | NOT CONFIRMED |
| PDF-08 | 3 | School Go-Live Readiness | MISSING | **CL-05 (NEW), AS-01, FB-08** | Before activation schools get setup checks; avoid operator bootstrap deadlock | NOT CONFIRMED |
| PDF-09 | 4 | Receipt / Student Numbering Across Years | MISSING | **CL-06 (NEW), FE-07, FB-05** | Continuous vs academic vs financial year numbering and no old code collisions | NOT CONFIRMED |
| PDF-10 | 4 | Historical Class and Section Record | Partly AS-03 | **AS-03, AS-06** | Exact 2025–26 class/section history and stable issue-time printed records | NOT CONFIRMED |

## PDF stated client questions needing decisions, not silent defaulting

- **PDF-01** normal year boundaries and whether only one active.
- **PDF-02** bulk promotions, repeat, section change, pass-out, leaving school.
- **PDF-03** formal close/lock and controlled history correction.
- **PDF-04** TC auto-leaving? Future fees/transport from leaving date? Leaving without TC?
- **PDF-05** fee start month, exit stop month and class-change-effective fee during year.
- **PDF-06** mid-year operating schools: opening debt, prior payment import or only fresh start?
- **PDF-07** inactive student return: explicit new session/class/section?
- **PDF-08** minimum go-live data: active year, class, sections, operator mandatory vs optional?
- **PDF-09** receipt and student numbers continuous or reset by academic/financial year; configurable?
- **PDF-10** retain and display complete year-wise class/section history?

**Use client decision process:** each row should receive exactly one human-selected value `IN_CURRENT_SCOPE`, `DEFER_NEXT_PHASE`, `NOT_REQUIRED` with who/date/evidence in TASK-TRACKER approval log; do not label research as approved.

## Cross-check with other provided client feedback

| Client request | Mapped delivery task(s) | Scope distinction |
|---|---|---|
| DOCX page 1 single welcome/operator CTA | FB-01 | Hide public admin link, preserve secure admin login |
| DOCX page 1 school IDs + print | FB-02/03 | Official school codes not student UDISE; no data drop |
| DOCX page 2 optional Aadhaar | FB-04 | **Changes approved PRD required Aadhaar** |
| DOCX page 3 new receipt layout/currency/operator | FB-05 | Two copies, frozen collector name |
| DOCX page 4 payment history download | FB-06 | Per-receipt PDF; bulk download optional pending request |
| DOCX page 5 two operator types | FB-07/08 | Deny-by-default report allow-list and full manager |
| Chat 1 Admit Card Generator | DC-03/04 | **Separate paid CR, no coding until approved** |
| Chat 2 TC and Admit Card blocked by pending fees | DC-02/04 | Same authoritative fee clearance, two policy contexts |
| Chat 3 concession description | FE-06 | Nonretroactive financial snapshot policy conflicts with current code |
| Chat 4 fee options | FE-01/02/03/07 | Requires multi-fee ledger foundation, not dropdown-only |
| Chat 5 carry forward previous month | FE-05,CL-02,AS-05 | Original older charge retained, no extra balance record |
| Chat 6 books/uniform during admission | FE-04 | Optional fee charges only |
| Chat 7 no separate stock management | FE-04 exclusion | Explicitly NO books/uniform module |

## Authority conflicts discovered by comparing with Harness

**Approved PRD v2.0.0** identifies Aadhaar as **required** (FR-STU-001), Platform Admin as official TC issuer (FR-ADMIN-007), class monthly fee only (FR-FEE-001..010) and **automatic academic-year rollover + exams as out of scope**. **Approved Fee DLD v2.0.0** makes generated dues fixed snapshots / future-only effects, but current code contains pending-fee concession synchronization that mutates existing debt. These are normative conflicts, not documentation formatting. Before coding, update PRD/HLD module boundaries and obtain prescribed human approvals through JASIQ workflows. Do not change canon silently or invent FR/BR IDs.

## Closure checklist for architecture reviewer

- [ ] Client scope decision recorded for each of 10 PDF clarifications.
- [ ] 26 earlier tasks are still present with original IDs.
- [ ] Six new CL tasks present and dependencies wired (32 unique tasks).
- [ ] All 13 current client DOCX/Chat requests have target IDs; paid CR stays blocked.
- [ ] Each task file includes requirement, use cases, concrete design, FE/BE/NFR cases.
- [ ] No file other than TASK-TRACKER owns current execution status.
- [ ] Concession retroactivity conflict explicitly resolved.
- [ ] Academic rollover out-of-scope status formally revised if selected for current delivery.
- [ ] No direct fees/transport/student repository reach-through in new module code.
- [ ] No go-live readiness/first-operator provisioning deadlock.
- [ ] Opening balances and previous-month arrears do not create duplicate assessed amounts.
- [ ] Approval tracker and tests show actual evidence instead of treating planned tests as executed.
