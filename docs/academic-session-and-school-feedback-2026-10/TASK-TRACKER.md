# SINGLE SOURCE OF TRUTH — DELIVERY TASK TRACKER

**Updated:** 2026-10-16. **Scope:** 32 tasks (26 previous + 6 newly discovered after re-reading the earlier 10-point research PDF). **Branch:** `feature/academic-session-school-feedback-specs-20261016`. **Code baseline:** `main@3d5a609f50be88af8366338bc7466316b435bbc1`.

> **Owner rule:** This is the ONE authoritative **execution status tracker** for this change set. Individual task files specify requirements/DLD/test cases but must NOT maintain competing completion statuses. Before starting work, agent/developer MUST update this tracker and commit it; after testing, update it again in the same task PR. **No implementation has been done under this specification branch.**

## Status vocabulary / mandatory update contract

- `NOT_STARTED` — no implementation work; planning documentation may be complete.
- `BLOCKED` — waiting on explicit client/scope/legal/commercial approval or upstream task.
- `IN_PROGRESS` — named owner assigned, implementation underway.
- `DEV_DONE` — code complete with implementation PR, tests still under way.
- `QA_IN_PROGRESS` — FE/BE/NFR verification underway.
- `QA_FAILED` — specific failing tests or regression.
- `READY_FOR_REVIEW` — all acceptance tests and NFR evidence supplied.
- `DONE` — approved, merged to intended base, migration/release notes verified.

**Every status change MUST update:** `Status`, `Owner`, `Started`, `Updated`, `PR / Commit`, `FE / BE / NFR evidence`, `Blocker / Review note`. For untouched tasks `-` is allowed. Changes must be scoped to one task row; when parallel developers touch the tracker, rebase and resolve carefully. Owner must add a timestamped journal note below and link the task file. No “DONE” based only on screenshots or unit tests. No blanket bulk status updates.

**Approval field** is distinct from development status. `PENDING_CLIENT` for academic-year clarifications because PDF page 6 has **unchecked** boxes; `PENDING_CR_APPROVAL` for separately charged admit cards. All other tasks require the project owner to approve changes against existing PRD/HLD; `PENDING_SCOPE` until approved. A task can be `NOT_STARTED` while approval is pending, but developers **may not** start implementation before approval is recorded.

## 32-task register

| ID | Task | Priority | Dependencies | Source | Approval | Status | Owner | Started | Updated | PR / Commit | FE / BE / NFR evidence | Blocker / Review note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [AS-01](tasks/AS-01.md) | Academic session definition/dates | P0 | — | PDF-01 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [AS-02](tasks/AS-02.md) | Session activation/close/correction | P0 | AS-01 | PDF-03 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [AS-03](tasks/AS-03.md) | Session-scoped student enrollment/history | P0 | AS-01 | PDF-10 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [AS-04](tasks/AS-04.md) | Year-end promotion/repeat/pass-out | P0 | AS-02,AS-03 | PDF-02 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [AS-05](tasks/AS-05.md) | Session financial continuity/arrears | P0 | AS-03,FE-07 | PDF-01,PDF-05 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [AS-06](tasks/AS-06.md) | Year selector & session-aware reports | P1 | AS-02,AS-03 | PDF-01,PDF-10 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [CL-01](tasks/CL-01.md) | Leaving/TC/pass-out lifecycle integration | P0 | AS-03,DC-01,CL-02 | PDF-04 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [CL-02](tasks/CL-02.md) | Fee start/stop & intra-year class change | P0 | AS-03,FE-01,FE-07 | PDF-05 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [CL-03](tasks/CL-03.md) | Mid-year onboarding/opening balances | P0 | AS-01,FE-07 | PDF-06 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [CL-04](tasks/CL-04.md) | Student reactivation/re-admission | P1 | AS-03,CL-02 | PDF-07 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [CL-05](tasks/CL-05.md) | School go-live readiness gate | P1 | AS-01,FB-08 | PDF-08 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [CL-06](tasks/CL-06.md) | Student & receipt number policy | P1 | AS-01,FE-07 | PDF-09 | PENDING_CLIENT | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FB-01](tasks/FB-01.md) | Public welcome / single operator CTA | P1 | — | DOCX-01 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FB-02](tasks/FB-02.md) | School UDISE/code/affiliation identifiers | P1 | — | DOCX-02 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FB-03](tasks/FB-03.md) | Remove student UDISE UI / official prints | P1 | FB-02 | DOCX-02 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FB-04](tasks/FB-04.md) | Optional Aadhaar on admission & import | P0 | — | DOCX-03 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FB-05](tasks/FB-05.md) | Two-copy detailed receipt / collector | P1 | FE-07 | DOCX-04 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FB-06](tasks/FB-06.md) | Download PDF receipt in history | P1 | FB-05 | DOCX-05 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FB-07](tasks/FB-07.md) | Reports-only operator effective access | P0 | FB-08 | DOCX-06 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FB-08](tasks/FB-08.md) | Operator role model and server enforcement | P0 | — | DOCX-06 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FE-01](tasks/FE-01.md) | Fee category/rule catalog | P0 | — | CHAT-04 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FE-02](tasks/FE-02.md) | Registration/admission one-time charges | P0 | FE-01,FE-07 | CHAT-04 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FE-03](tasks/FE-03.md) | Transport/exam/late/other charges | P1 | FE-01,FE-07,CL-02 | CHAT-04 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FE-04](tasks/FE-04.md) | Books/uniform selected at admission | P1 | FE-01,FE-07 | CHAT-06 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FE-05](tasks/FE-05.md) | Previous-month arrears presentation | P0 | FE-07,CL-02 | CHAT-05 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FE-06](tasks/FE-06.md) | Concession reason/eligibility/audit | P1 | FE-01,FE-07 | CHAT-03 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [FE-07](tasks/FE-07.md) | Multi-charge ledger/payment allocations | P0 | — | ARCH/CHAT-04,05 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [DC-01](tasks/DC-01.md) | TC accessible in operator panel | P1 | FB-08 | PDF-04/CHAT-02 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [DC-02](tasks/DC-02.md) | TC fee-clearance issuance enforcement | P0 | DC-01,FE-07 | CHAT-02 | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [DC-03](tasks/DC-03.md) | Admit Card Generator (paid CR) | CR | AS-06,FB-08 | CHAT-01 | PENDING_CR_APPROVAL | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [DC-04](tasks/DC-04.md) | Admit Card clearance policy (paid CR) | CR | DC-03,DC-02 | CHAT-02 | PENDING_CR_APPROVAL | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |
| [DC-05](tasks/DC-05.md) | Versioned document registry/retry/download | P1 | DC-01 | ARCH | PENDING_SCOPE | NOT_STARTED | - | - | - | - | - | Await approval/spec alignment |

## Test evidence notation

Per row, replace the dash with **named commands** and immutable artifact links, e.g. `FE: docs/qa/AS-01/viewport.png; BE: npm ... 15/15; NFR: load AS-01 p95=... ms; security: 12/12`. If a category is not applicable, explain **why**, never just mark “pass.” Test failures must be recorded explicitly.

## Daily update example

1. Claim only unblocked task AS-01; change status to `IN_PROGRESS`, set name and ISO date, note planned branch/PR.
2. Implement strictly according to `tasks/AS-01.md`; respect `ARCHITECTURE-DECISIONS.md` and the canonical Harness review gate.
3. Update tracker to `DEV_DONE` when code + migrations are committed, then to `QA_IN_PROGRESS` with test plan execution.
4. Attach FE/BE/NFR results, cross-tenant checks and release checklist; move `READY_FOR_REVIEW`.
5. Independent reviewer checks evidence; after accepted merge and release handoff, move `DONE` with PR/commit. **Never skip review.**

## Change journal

| Timestamp (UTC) | Task | Actor | From → To | Evidence / decision |
|---|---|---|---|---|
| 2026-10-16 | ALL | Specifications | New → NOT_STARTED | Task decomposition and design only; no coding or testing run. |

## Approval log (fill before starting implementation)

| Decision / source | Approved by | Date | Link | Effect |
|---|---|---|---|---|
| 10-point research PDF scope matrix | PENDING | — | — | All AS/CL descriptions are proposals pending explicit selection of current/next/not required |
| Client feedback DOCX + chat scope | PENDING | — | — | FB/FE/DC scope and pricing gates |
| Updated PRD/HLD, user stories, UIUX, canonical DLD | PENDING | — | — | Required JASIQ Harness authority prior to code |
