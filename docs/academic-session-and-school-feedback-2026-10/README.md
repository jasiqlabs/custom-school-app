# School ERP — Academic Session + Client Feedback: Engineering Task Register

**Specification status:** Planning only, no application behavior changed.  
**Reviewed code baseline:** `main` at `3d5a609f50be88af8366338bc7466316b435bbc1`, 2026-10-16.  
**Important:** Repository has **no `master` branch**. The default GitHub branch is currently `feature/mod-001-platform-admin-school-onboarding`; all findings below deliberately use `main`.  
**Input sources:** Client-provided document `update 2.docx` (pages 1–5); 7 additional requirements in chat; previously discussed academic-year/session management.  
**Explicit exclusion:** Do not create separate books or uniform inventory/management modules.  
**Commercial exclusion:** Admit Card Generator is a **separately chargeable change request**, not part of the original agreed scope. Document it now, implement only after approval.

## The 26 distinct implementation tasks

| ID | Feature / deliverable | Baseline as reviewed | Priority | Dependencies |
|---|---|---|---|---|
| AS-01 | School academic-year/session configuration and dates | Missing | P0 | — |
| AS-02 | Active session, close/archive and lock rules | Missing | P0 | AS-01 |
| AS-03 | Session-linked student enrollments / history | Partly exists without session | P0 | AS-01 |
| AS-04 | Bulk promotion, repeat, transfer-out, completion & rollback preview | Missing | P0 | AS-02/03 |
| AS-05 | Session fee boundaries, arrears preservation and finance reconciliation | Missing | P0 | AS-03, FE-05/07 |
| AS-06 | Active/historical session selector, reports and downstream contracts | Missing | P1 | AS-02/03/05 |
| FB-01 | Single public welcome/Manage Your School CTA; conceal admin portal CTA only | Missing | P1 | — |
| FB-02 | School-level UDISE, School Code, Affiliation Number | Missing | P1 | — |
| FB-03 | Remove *student* UDISE admission control; add school codes on TC/admission forms | Missing / partly present | P1 | FB-02 |
| FB-04 | Aadhaar optional for manual admission, update and XLSX import | Missing | P0 | — |
| FB-05 | Two-copy fee receipt layout; rupee glyph & collecting operator | Partially present | P1 | FE-07 |
| FB-06 | Download receipt from Payment History | Print-only exists | P1 | FB-05 |
| FB-07 | Read-only operator: only reports view and download | Missing | P0 | FB-08 |
| FB-08 | Full-management operator and server-enforced capability/RBAC model | Current operators all full access | P0 | — |
| FE-01 | Configurable fee-type catalog and charge semantics | Only monthly class fee | P0 | — |
| FE-02 | Registration and admission charges (one-time, no duplicates) | Missing | P0 | FE-01 |
| FE-03 | Transport, exam, late, other charges and cadence | Missing as fee categories | P1 | FE-01 |
| FE-04 | Optional book/uniform charges during admission; fees only | Missing | P1 | FE-01/02 |
| FE-05 | Month-wise arrears carried forward and displayed without double booking | Partly lists existing due months | P0 | FE-07 |
| FE-06 | Concession reason/description and revised snapshots | Type/value exist; reason missing | P1 | FE-01 |
| FE-07 | Transaction-safe multi-line dues and payment allocation | Current payment is tied to one monthly due | P0 technical prerequisite | FE-01 |
| DC-01 | Operator-panel TC issue/list/download using tenant scope | TC is platform-admin only | P1 | FB-08 |
| DC-02 | Block TC issuance when any relevant fee remains due | Missing | P0 | FE-05/07, DC-01 |
| DC-03 | Operator-panel Admit Card Generator, exam context & downloadable PDF | Missing; separately paid | **Change request** | AS-06, FB-08 |
| DC-04 | Block admit card issuance when relevant fee remains due | Missing; with DC-03 | **Change request** | DC-03, FE-05/07 |
| DC-05 | Versioned, immutable, auditable generated document and download life-cycle | TC partly supports | P1 | DC-01/03 |

### Source-to-task reconciliation (nothing silently omitted)

**Client document, page 1:** public welcome CTA → FB-01; remove student UDISE and add 3 school identifiers on documents → FB-02, FB-03.  
**Page 2:** Aadhaar not mandatory → FB-04.  
**Page 3:** receipt redesign, `₹` and operator name → FB-05. **Note:** extracted source says replace `Rs.` with `?`; sample appears to use `₹`, confirmation requested.  
**Page 4:** Download in Payment History → FB-06.  
**Page 5:** two operator types → FB-07/08.  
**Additional items 1–7:** admit cards → DC-03; TC/admit card dues blockade → DC-02/04; concession description → FE-06; added fee types → FE-01/02/03; previous month pending → FE-05; books/uniform on admission → FE-04; no inventory module → exclusion above.  
**Previously discussed:** complete academic session lifecycle → AS-01..06.

## How junior developers / agents should use this folder

1. Read `01-current-state-audit.md` and use the **main commit SHA** shown there; refresh the audit if code has moved.
2. Read task-specific **Requirement → DLD → FE tests → BE tests → NFR tests** in `02-academic-session.md`, `03-client-feedback.md`, `04-fees.md` and `05-documents.md`.
3. Check `06-cross-cutting-tests-and-release.md`; implement migrations additively and maintain existing flows.
4. Confirm business choices in `07-open-decisions.md` **before** committing to irreversible designs. Mark all assumptions in PR descriptions.
5. Develop in small feature branches from the current stable `main`. Do not merge this planning branch as functional implementation.

## Non-negotiable invariants

- Strict `schoolId` isolation on every query, job, document and report.
- Preserve historical school, student, fee, receipt, enrollment and TC data.
- No breaking change to old login, platform-admin routes, TC download, receipts, import or fee collection.
- No fee double counting, silent balance mutation, duplicate admission charge, duplicate promotion, or loss of payment history.
- Do not expose Aadhaar in logs, exports, documents or URLs; keep existing encrypted-profile and audit protections.
- UI restrictions are not authorization; server must reject unauthorized writes and downloads.
- All new paths require FE, BE, NFR and negative/tenant-isolation tests.
