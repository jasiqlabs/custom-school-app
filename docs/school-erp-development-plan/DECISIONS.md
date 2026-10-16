# Implementation Policy Decisions — Questions Only


This file records unanswered operational or commercial decisions that may affect an already defined engineering task. **It is not a task tracker or a separate workstream.** Decisions must be resolved before the affected task starts; record the decision evidence and implementation state only in [TASK-TRACKER.md](TASK-TRACKER.md).

| No | Question / risk | Suggested safe default | Blocks |
|---|---|---|---|
| Q01 | Can schools choose custom academic-year start and end dates? | Yes, one active per school; no fixed April–March assumption | TASK-007 |
| Q02 | Should academic year close be allowed with unpaid balances and incomplete promotions? | Allow unpaid balances but give prominent warnings; preserve debt, block incomplete transition if necessary | TASK-021, TASK-025 |
| Q03 | How to map existing live enrollments to old academic year if historic dates unknown? | Review-and-confirm per school; no silent fabricated histories | TASK-008 |
| Q04 | What are promotion outcomes and is repeat/transfer/graduate reversible? | Explicit choices, audited correction only; never delete existing financial rows | TASK-022, TASK-024 |
| Q05 | Is registration/admission fee once per student at school or once per fresh annual admission? | Once per school student identity; re-admission only if explicitly allowed | TASK-016, TASK-023 |
| Q06 | Are Books/Uniform selected per item, per quantity, or one fixed bundle charge? | Simple optional one-off configured amounts; **no inventory** | TASK-017 |
| Q07 | Does transport fee follow active transport assignment automatically, and when does billing start/end? | Link to assignment only after explicit rule approval | TASK-014, TASK-018 |
| Q08 | Is Late Fee manual or automated? If automated, what grace period, amount/cap and effective date? | Manual initially, no automatic penalty | TASK-018 |
| Q09 | Does a concession apply to tuition only or registration, admission, transport, etc.? Is reason mandatory? | Tuition only, reason required when >0 (needs client approval) | TASK-015 |
| Q10 | How are multi-item payments allocated: oldest-first automatically or manually chosen lines? | Oldest-first with itemized preview, editable only for authorized manager | TASK-013, TASK-019 |
| Q11 | Should past months with no due because app wasn't running be back-billed? Starting from admission or fee rule effective month? | Show preview and client consent before any retroactive generation | TASK-019, TASK-020 |
| Q12 | What fee statuses block TC: every unpaid category, previous session, waived item, or only dues through issue date? Any override? | All actually due outstanding > ₹0 across all sessions; no override until approved | TASK-032 |
| Q13 | For admit card, does clearance check all fees or only through exam cutoff? | As-of-exam cutoff configurable only after approval | TASK-035 |
| Q14 | Admit Card: exact template fields, subject schedule, term setup, batch generation and expected output? | Define minimal exam metadata separately; no invented exam module | TASK-034, TASK-035 |
| Q15 | Admit Card Generator is outside agreed scope. Have quote, timeline and written approval been accepted? | **No code implementation before approval** | TASK-034, TASK-035 |
| Q16 | 'Download in Payment History': per-receipt PDF, filtered bulk export, or both? | Per-receipt PDF is included; bulk export separately assessed | TASK-031 |
| Q17 | Fee receipt instruction says replace 'Rs.' with a glyph extracted as '?'. Is desired symbol **₹**? | Yes, sample appears to use ₹; confirm in writing | TASK-030 |
| Q18 | Receipt copies: single two-copy page/PDF or two separate PDFs? Show signature or just operator name? | Single printable PDF with Office Copy + Student Copy, printed operator full name, no fake signature | TASK-030 |
| Q19 | Which exact reports can Operator Type 1 view/download? Are student PII or payment-level details included? | Reports-only allow-list with minimized personal information | TASK-002 |
| Q20 | Can Type 2 manage **all school operations** including year close and TC, or are some admin-only? | All school operational modules, but no platform-wide tenant admin | TASK-001, TASK-025, TASK-033 |
| Q21 | Are school UDISE, school code and affiliation number required and unique? Can they be blank for already onboarded schools? | Nullable, string preserving leading zeroes, validate known UDISE format after confirmation | TASK-003 |
| Q22 | Should TC/admission printing be forbidden if any school identifier is missing? | Show optional code gracefully; admin profile warning, no sudden block for old tenants | TASK-005, TASK-029 |
| Q23 | Does the client want **student UDISE field removed from data**, or only the misleading admission form control? | Remove from UI first, preserve existing data until migration approval | TASK-005 |
| Q24 | If Aadhaar provided, must it remain Verhoeff-validated? | Yes, keep current security + validation when present | TASK-004 |
| Q25 | Should reports/fees include past academic sessions accessible to view-only operator? | Only explicitly approved session-stamped reports, never generic old student profile access | TASK-002, TASK-026 |

## Decisions that must not be guessed

- TC fee clearance policy and financial arrears generation are **financial/business rules** and require the school/client to confirm.
- Hardening Aadhaar optionality involves actual handling of sensitive identifiers; keep encrypted last-four rules; do not force a fake value.
- Client agreed that **there is no separate Books and Uniform Management module**; do not expand into inventory, distribution, procurement or stores.
- **No automatic late fees** until policy is supplied.
- **No exam scheduling/grading** just because an Admit Card requires exam metadata.
- `AGENTS.md` in the repository states canonical specifications reside in the **JASIQ harness**. These files are implementation-planning artifacts. Before coding, reconcile the approved decisions through the canonical planning and DLD workflow.

## Suggested client confirmation wording

> We have identified all requested changes including academic sessions, Aadhaar optionality, fees, receipts, operator roles and certificates. We will preserve existing records and restrict the read-only operator to approved reports. Please confirm the policy questions on pending fees, fee categories, academic year close, receipt copies, and Admit Card details. Admit Card development remains a separately chargeable feature, pending your approval.


## Clarifications added after re-reading the six-page academic lifecycle PDF

**Note:** The PDF page 6 decision matrix contains **no checked boxes**. These are explicit *client decision gates*, not accepted behavior.

| ID | Original PDF item | Required unambiguous client answer | Suggested design if included | Tasks |
|---|---|---|---|---|
| Q26 | PDF-04 leaving/TC/pass-out | Does TC automatically terminate enrollment; may student leave without TC; exact leaving date and transport stop? | Explicit ExitWorkflow with date; TC issuing separate unless approved | TASK-022, TASK-033 |
| Q27 | PDF-05 mid-year fee eligibility | Bill start month on admission; stop month on leaving; mid-month prorating; class change rate precedence? | Versioned FeeEligibilityPolicy and effective-dated enrollment segments | TASK-014 |
| Q28 | PDF-06 mid-year onboarding | Import opening outstanding only, historical collected receipts, or both? Are migrated historic receipts official new receipts? | OpeningBalance postings with source provenance; **never pretend imported historical collections were SaaS receipts** | TASK-020 |
| Q29 | PDF-07 reactivation | Can inactive student return; choose new session/class/section; new fee policy? | Same Student UUID, new enrollment, explicit re-admission event | TASK-023 |
| Q30 | PDF-08 school readiness | Which fields mandatory vs warning? Operator required before activation? | Resolve school ACTIVE prerequisite for operator creation before enforcing readiness | TASK-011 |
| Q31 | PDF-09 numbering | Student ID/SR and receipts continuous vs academic year vs financial year; reset and prefixes? | Separate versioned policy per number type, transaction-safe series | TASK-027 |
| Q32 | PDF-10 history | How far back to preserve class and section placements? | Year-wise immutable enrollment snapshots, with explicit unverifiable legacy rows | TASK-008, TASK-026 |
| Q33 | Approved PRD scope conflict | Should automatic rollover/exams, Aadhaar optionality and operator TC change original approved scope? | Update official PRD/HLD and run Harness approval; do NOT pretend new client message silently revised authority | TASK-004, TASK-007, TASK-012, TASK-013, TASK-032, TASK-034, TASK-035 |
| Q34 | Current fee engine/DLD discrepancy | Should an already generated unpaid due be recalculated on concession change? | Freeze original charge; append authorized adjustment; conform to approved DLD until formally revised | TASK-013, TASK-015 |

## Required signoff record (copy for each PDF row)

```text
PDF item:
Client decision: IN_CURRENT_SCOPE | DEFER_NEXT_PHASE | NOT_REQUIRED
Exact business policy:
Evidence link / meeting transcript:
Approved by / date:
Harness updated FR/BR/story/UIUX/DLD links:
Impacted task IDs:
```

**The product owner has requested these enhancements for the ongoing product, but the unselected research-specific business options are not automatically confirmed.** Resolve individual scope/policy questions and proceed with independent, unblocked tasks. A proposed implementation strategy is not scope approval.


**Execution rule:** approval/scope status belongs to the single tracker; this file only explains unresolved policy choices and does not maintain competing task state.
