# Business Decisions Needed Before Implementing Potentially Irreversible Behavior

These are **not additional features**. They are unresolved choices left open by client feedback or implicit financial/academic workflows. The default below is an engineering recommendation, **not** an approved client requirement.

| No | Question / risk | Suggested safe default | Blocks |
|---|---|---|---|
| Q01 | Can schools choose custom academic-year start and end dates? | Yes, one active per school; no fixed April–March assumption | AS-01/02 |
| Q02 | Should academic year close be allowed with unpaid balances and incomplete promotions? | Allow unpaid balances but give prominent warnings; preserve debt, block incomplete transition if necessary | AS-02/04/05 |
| Q03 | How to map existing live enrollments to old academic year if historic dates unknown? | Review-and-confirm per school; no silent fabricated histories | AS-03 |
| Q04 | What are promotion outcomes and is repeat/transfer/graduate reversible? | Explicit choices, audited correction only; never delete existing financial rows | AS-04 |
| Q05 | Is registration/admission fee once per student at school or once per fresh annual admission? | Once per school student identity; re-admission only if explicitly allowed | FE-02 |
| Q06 | Are Books/Uniform selected per item, per quantity, or one fixed bundle charge? | Simple optional one-off configured amounts; **no inventory** | FE-04 |
| Q07 | Does transport fee follow active transport assignment automatically, and when does billing start/end? | Link to assignment only after explicit rule approval | FE-03 |
| Q08 | Is Late Fee manual or automated? If automated, what grace period, amount/cap and effective date? | Manual initially, no automatic penalty | FE-03 |
| Q09 | Does a concession apply to tuition only or registration, admission, transport, etc.? Is reason mandatory? | Tuition only, reason required when >0 (needs client approval) | FE-06 |
| Q10 | How are multi-item payments allocated: oldest-first automatically or manually chosen lines? | Oldest-first with itemized preview, editable only for authorized manager | FE-05/07 |
| Q11 | Should past months with no due because app wasn't running be back-billed? Starting from admission or fee rule effective month? | Show preview and client consent before any retroactive generation | FE-05 |
| Q12 | What fee statuses block TC: every unpaid category, previous session, waived item, or only dues through issue date? Any override? | All actually due outstanding > ₹0 across all sessions; no override until approved | DC-02 |
| Q13 | For admit card, does clearance check all fees or only through exam cutoff? | As-of-exam cutoff configurable only after approval | DC-04 |
| Q14 | Admit Card: exact template fields, subject schedule, term setup, batch generation and expected output? | Define minimal exam metadata separately; no invented exam module | DC-03 |
| Q15 | Admit Card Generator is outside agreed scope. Have quote, timeline and written approval been accepted? | **No code implementation before approval** | DC-03/04 |
| Q16 | 'Download in Payment History': per-receipt PDF, filtered bulk export, or both? | Per-receipt PDF is included; bulk export separately assessed | FB-06 |
| Q17 | Fee receipt instruction says replace 'Rs.' with a glyph extracted as '?'. Is desired symbol **₹**? | Yes, sample appears to use ₹; confirm in writing | FB-05 |
| Q18 | Receipt copies: single two-copy page/PDF or two separate PDFs? Show signature or just operator name? | Single printable PDF with Office Copy + Student Copy, printed operator full name, no fake signature | FB-05 |
| Q19 | Which exact reports can Operator Type 1 view/download? Are student PII or payment-level details included? | Reports-only allow-list with minimized personal information | FB-07 |
| Q20 | Can Type 2 manage **all school operations** including year close and TC, or are some admin-only? | All school operational modules, but no platform-wide tenant admin | FB-08 / DC-01 |
| Q21 | Are school UDISE, school code and affiliation number required and unique? Can they be blank for already onboarded schools? | Nullable, string preserving leading zeroes, validate known UDISE format after confirmation | FB-02 |
| Q22 | Should TC/admission printing be forbidden if any school identifier is missing? | Show optional code gracefully; admin profile warning, no sudden block for old tenants | FB-03 |
| Q23 | Does the client want **student UDISE field removed from data**, or only the misleading admission form control? | Remove from UI first, preserve existing data until migration approval | FB-03 |
| Q24 | If Aadhaar provided, must it remain Verhoeff-validated? | Yes, keep current security + validation when present | FB-04 |
| Q25 | Should reports/fees include past academic sessions accessible to view-only operator? | Only explicitly approved session-stamped reports, never generic old student profile access | FB-07/AS-06 |

## Decisions that must not be guessed

- TC fee clearance policy and financial arrears generation are **financial/business rules** and require the school/client to confirm.
- Hardening Aadhaar optionality involves actual handling of sensitive identifiers; keep encrypted last-four rules; do not force a fake value.
- Client agreed that **there is no separate Books and Uniform Management module**; do not expand into inventory, distribution, procurement or stores.
- **No automatic late fees** until policy is supplied.
- **No exam scheduling/grading** just because an Admit Card requires exam metadata.
- `AGENTS.md` in the repository states canonical specifications reside in the **JASIQ harness**. These files are implementation-planning artifacts. Before coding, reconcile the approved decisions through the canonical planning and DLD workflow.

## Suggested client confirmation wording

> We have identified all requested changes including academic sessions, Aadhaar optionality, fees, receipts, operator roles and certificates. We will preserve existing records and restrict the read-only operator to approved reports. Please confirm the policy questions on pending fees, fee categories, academic year close, receipt copies, and Admit Card details. Admit Card development remains a separately chargeable feature, pending your approval.
