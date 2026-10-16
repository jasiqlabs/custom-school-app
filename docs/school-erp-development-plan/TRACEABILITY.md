# Requirement Traceability — One Ordered Task List

This is a **coverage appendix**, not a source-based implementation plan. Each required outcome belongs to a single ordered engineering task. The origin column helps verify no feedback was lost, but does not influence architecture, code ownership or delivery order. All execution status, approvals and test evidence live **only** in [TASK-TRACKER.md](TASK-TRACKER.md).

| Ordered task | Functional outcome | Evidence |
|---|---|---|
| [TASK-001](tasks/TASK-001.md) | Operator roles and server-side authorization | Client feedback document page 5 |
| [TASK-002](tasks/TASK-002.md) | Reports-only role and secured exports | Client feedback document page 5 |
| [TASK-003](tasks/TASK-003.md) | School UDISE, School Code, affiliation fields | Client feedback document page 1 |
| [TASK-004](tasks/TASK-004.md) | Optional Aadhaar for manual and imported students | Client feedback document page 2 |
| [TASK-005](tasks/TASK-005.md) | Remove student UDISE input; admission-form school identity | Client feedback document page 1 |
| [TASK-006](tasks/TASK-006.md) | One public 'Manage Your School' entry | Client feedback document page 1 |
| [TASK-007](tasks/TASK-007.md) | Create and activate academic school years | Academic research question 1 |
| [TASK-008](tasks/TASK-008.md) | Bind student enrollments to years and preserve history | Academic research questions 1 and 10 |
| [TASK-009](tasks/TASK-009.md) | Effective-dated class/section changes | Academic research questions 5 and 10 |
| [TASK-010](tasks/TASK-010.md) | Current-year context on student screens | Academic research questions 1 and 10 |
| [TASK-011](tasks/TASK-011.md) | Go-live checklist and operator bootstrap | Academic research question 8 |
| [TASK-012](tasks/TASK-012.md) | Fee category catalog and rule definitions | Additional requested requirement 4 |
| [TASK-013](tasks/TASK-013.md) | Multi-charge ledger and atomic allocations | Technical prerequisite for additional requirements 4, 5 and 6 |
| [TASK-014](tasks/TASK-014.md) | Fee billing start/stop/class-change eligibility | Academic research question 5 |
| [TASK-015](tasks/TASK-015.md) | Concession description and financial correction rules | Additional requested requirement 3 |
| [TASK-016](tasks/TASK-016.md) | One-time registration/admission charges | Additional requested requirement 4 |
| [TASK-017](tasks/TASK-017.md) | Books/Uniform admission charges only | Additional requested requirements 6 and 7 |
| [TASK-018](tasks/TASK-018.md) | Transport/Exam/Late/Other fee assessment | Additional requested requirement 4 |
| [TASK-019](tasks/TASK-019.md) | Previous-month pending fee carry-forward | Additional requested requirement 5 |
| [TASK-020](tasks/TASK-020.md) | School opening balances on mid-year onboarding | Academic research question 6 |
| [TASK-021](tasks/TASK-021.md) | Financial continuity between school years | Academic research questions 1 and 3 |
| [TASK-022](tasks/TASK-022.md) | Leave/transfer/pass-out with effective stopping dates | Academic research questions 2 and 4 |
| [TASK-023](tasks/TASK-023.md) | Re-admission of returning student | Academic research question 7 |
| [TASK-024](tasks/TASK-024.md) | Stage promotion/repeat/graduation decisions | Academic research question 2 |
| [TASK-025](tasks/TASK-025.md) | Close year and finalize staged transitions | Academic research questions 2 and 3 |
| [TASK-026](tasks/TASK-026.md) | Historic-year reports and exports | Academic research question 10 |
| [TASK-027](tasks/TASK-027.md) | Receipt and student number sequence rules | Academic research question 9 |
| [TASK-028](tasks/TASK-028.md) | Document snapshot/file/worker safety infrastructure | Approved platform security HLD + document change prerequisites |
| [TASK-029](tasks/TASK-029.md) | School codes and historical enrollment on TC PDF | Client feedback document page 1 |
| [TASK-030](tasks/TASK-030.md) | Two-copy itemized fee receipt with collector | Client feedback document page 3 |
| [TASK-031](tasks/TASK-031.md) | Download receipt from Payment History | Client feedback document page 4 |
| [TASK-032](tasks/TASK-032.md) | Fee clearance enforced before new TC | Additional requested requirement 2 |
| [TASK-033](tasks/TASK-033.md) | Transfer Certificate operator workflow | Academic research question 4; proposed extension of existing platform TC |
| [TASK-034](tasks/TASK-034.md) | Admit Card exam context, paid CR | Additional requested requirement 1; separate commercial approval |
| [TASK-035](tasks/TASK-035.md) | Admit Card issuance and fee gate, paid CR | Additional requested requirements 1 and 2; separate commercial approval |

## Completeness checks

- All **10** previously researched school-year/lifecycle clarification topics are represented in concrete tasks with no unsupported invented policy.
- All **7** additional requested items are represented: Admit Card Generator; fee-clearance blocking for TC/cards; concession reason; expanded fee types; previous-month arrears; Books/Uniform fees during admission; explicitly **no separate Book/Uniform inventory management**.
- The attached feedback document items are represented: one public school-management entry, school identifiers on school/prints, Aadhaar optionality, revised two-copy receipts with operator and currency, Payment History download, and two operator types.
- Existing monthly fees, payments/void, student import, platform-admin TC, transport, reports, dashboard, authentication and old documents must continue to work.
- Proposed TC access in the **operator panel** is recorded separately from the confirmed original platform-admin TC capability; confirm scope as noted in the tracker.
- Paid Admit Card work requires written commercial approval before implementation. Its two tasks are still part of the single ordered engineering list.

**No implementation tests or user-facing features were executed by this documentation revision.**
