# Testing and Release — Whole Product Verification

**Approach:** Every task tests its **current deployable slice** without expecting unfinished future tasks. This is the common test contract in addition to named per-task FE/BE/NFR tests. The single source of status/evidence is [TASK-TRACKER.md](TASK-TRACKER.md).


**Scope:** Every TASK-001…TASK-035 deliverable. The test cases are planned; no runtime tests were executed by this documentation work.

## 1. Golden acceptance journeys (full stack)

| Scenario ID | End-to-end story | Required result |
|---|---|---|
| E2E-01 | Existing school + 2 existing full operators after migration | All old features, login, import, fee collection, transport, TC admin path still work |
| E2E-02 | Create 2026–27, admit student without Aadhaar, choose books/uniform | One student, one enrollment, only selected fee charges, no Aadhaar error or fake Aadhaar |
| E2E-03 | Admit same student retry/refresh | No duplicate student/enrollment/one-time fees |
| E2E-04 | School UDISE/School Code/Affiliation saved | Exact values on admission form and newly issued TC; no retrofit to old TC file |
| E2E-05 | August ₹700 fee, ₹200 payment, September ₹700 fee | Arrears ₹500 + current ₹700 = outstanding ₹1,200; no extra ledger charge |
| E2E-06 | Pay ₹600 across August/September (policy-dependent) | Source allocations sum ₹600, correct balances, one receipt ID; double-submit does not double post |
| E2E-07 | Reprint and download from payment history | Same immutable receipt number/amounts, correct operator name, office + student copies, clear VOIDED state |
| E2E-08 | Create TC when balance ₹1 | Both admin and operator issue APIs refuse; no PDF job or TC record queued |
| E2E-09 | Settle eligible dues then issue TC | Works, snapshot includes school codes and correct historic class, only one authorized PDF |
| E2E-10 | Void prior fee payment after TC already issued | Debt becomes pending and future new issuance blocks; prior immutable issued TC still available |
| E2E-11 | View-only operator opens operator edit URL/API | 403 and no mutation; can only view/download approved report resources |
| E2E-12 | Admin changes full operator to view-only during active login | Old session cannot retain write access; menu and APIs converge to new permission |
| E2E-13 | Close 2026–27 and promote/repeat/graduate to 2027–28 | New enrollment without duplicate identity; old enrollment and fees preserved; past session read-only |
| E2E-14 | Cross-tenant UUID from school B submitted by school A | All affected read/write/download/endpoints reject without information leakage |
| E2E-15 | Existing Aadhaar-bearing student profile | Encrypted data still resolves to masked last4 only; no loss during nullable migration |
| E2E-16 | New Admit Card CR after commercial sign-off | Fee-clearance, validated exam context, PDF/download and tenant role tests (do not run in core-scope release if deferred) |

## 2. Test case structure — mandatory per task

Each implementation PR must link task ID and contain:
- **Requirement tests:** happy path, zero/empty state, invalid input, alternate path, business policy, rollback.
- **FE:** UI route, form state, errors/toasts, keyboard access, actual print/PDF, mobile 360 px/tablet 768 px/desktop 1366 px, no hidden control mistaken for server security.
- **BE:** Zod validation, domain service and Prisma repository, integration contract, tenant boundary, role matrix, concurrency, idempotency, errors (400/401/403/404/409/422), audit.
- **NFR:** response-time baseline/p95 under representative use, concurrency, indexes, data privacy, accessibility, Unicode glyphs, upload/download file security, backup and rollback.
- **Regression:** existing student import, TC issue by platform admin, transport assignment, monthly fee config, partial payments, same-day void, generated receipt, operator authentication, school profile.
- **Evidence:** command, elapsed runtime, passing tests / counts, screen recording/screenshots at 3 viewport sizes, database assertion, evidence for every negative case.

## 3. Manual/local verification commands (root workspace)

```bash
npm install
npm run prisma:generate
npm run qa:static
npm test
npm run build
```

Additional integration tests should run against isolated Postgres/Redis/storage fixtures and a seeded **two-school** tenant dataset; manual QA is required because this project deliberately does not mandate GitHub Actions. Re-check `AGENTS.md` and canonical Harness project specs before any **implementation** branch.

## 4. Explicit test data fixtures

- Schools A and B, one platform admin, two full operators, one report-viewer.
- 5 students: Aadhaar populated, Aadhaar absent, one with concession, one with outstanding prior session, one graduated.
- 2026–27 active and 2027–28 draft/active transition, source class + destination class, two sections.
- Charges: registration, admission, tuition for 3 months, transport, exam, late, books, uniform, miscellaneous.
- Payments: full/partial, concurrent, duplicate idempotency key, VOIDED, previous session arrears.
- Files: current/legacy logo/signature, historical TC, new TC, receipt with 1 line and many lines, unknown expired file link.

## 5. Nonfunctional gates (proposed targets, not verified guarantees)

- **Availability / migration:** additive columns and tables first; existing endpoints continue serving; no unannounced data rewrite or delete. Reversible release plan, encrypted production backup and restore rehearsal.
- **Financial integrity:** zero unexplained variance in full backfill reconciliation for per-school `sum(charges)-sum(concessions)-sum(active allocations)=sum(outstanding)`; accounting precision to two decimal places; every void reversal traceable.
- **Security:** all mutation endpoints enforce role + CSRF; school scope from auth context; non-admin cannot access platform routes; private files via authorized short-lived links; no Aadhaar plaintext in logs, receipt, report, UI console.
- **Performance:** set and record SLO after measuring current baseline. Initial test scenarios: 500 students/school and 5k-student stress, 24 months of dues, 10 concurrent payment operators, 50 concurrent receipt downloads, year-end promotion of 500 students; review query plans & worker limits.
- **UX/accessibility:** responsive mobile/tablet/desktop, no cut-off controls in print, semantic form labels and keyboard nav, currency ₹ and leading-zero codes print accurately.
- **Operational readiness:** alert on financial reconciliation mismatch, retry exhaustion, document render failures, unexpected 403/500 increase, migration/backfill errors. Logs include requestId/tenantId/task ID, never PII.

## 6. Recommended staged rollout

**Stage 0: business approval + canonical specs.** Verify the open rules in `DECISIONS.md`; reconcile new spec into authoritative `jasiqlabs/jasiq-harness/jasiq-specs/projects/custom-school-app` using prescribed planning/UIUX/DLD workflow. Branch from **main**, not repository default.

**Stage 1: additive schema and RBAC core.** Backfill roles as MANAGER; add session tables/fields, Aadhaar nullable handling, school codes; ship disabled-by-default new paths, verify no regressions.

**Stage 2: financial ledger safety.** New charges/allocations, shadow backfill and reconciliation, old receipts and monthly fees adapter. **Do not** activate new fee writers if old/new totals differ.

**Stage 3: sessions and fee UX.** Year creation/enrollment/promotion and fee categories, arrears, concession, books/uniform, new receipt PDF/download; certify math on all workflows.

**Stage 4: documents.** Operator TC and server-side clearance; change template version. Admit Card CR separately after client commercial approval.

**Stage 5: gradual release.** Smoke test in staging, apply migrations, verify reads and logs, switch by feature flag, preserve rollback ability; promote to main only after local test evidence and reviewer sign-off.

## 7. PR sign-off form (copy into every task)

```text
Task ID:
Stable base commit:
Requirements accepted:
API & DB changes:
FE files/screens:
BE files/services:
Migrations/backfill verified:
FE tests passed / failed:
BE tests passed / failed:
NFR evidence:
Cross-tenant / security evidence:
Existing regression suite:
Known limitations:
Rollback instructions:
Reviewer:
```


## 8. Additional end-to-end journeys from previous academic research PDF

The original 16 scenarios missed several lifecycle/business cases; run these after client policy sign-off:

| ID | Scenario | Expected evidence |
|---|---|---|
| E2E-17 (TASK-022) | Leave without TC, leave with TC, pass-out | Enrollment and transport effective stop; no future new bills; previous debt/TC history intact |
| E2E-18 (TASK-014) | Admit in August, change class October, leave November | No bill before admitted period or after exit; October class fee follows approved policy; backdated adjustment auditable |
| E2E-19 (TASK-020) | Onboard school in August with external opening balances | Exact source workbook totals and provenance, no duplicate fee/receipt/income |
| E2E-20 (TASK-023) | Former student returns next year | Same UUID, explicit target year/class/section, historical class and debt unchanged |
| E2E-21 (TASK-011) | Go-live check for brand new school | Readiness gate works AND operator provisioning is still possible before/after activation per approved bootstrap |
| E2E-22 (TASK-027) | Change from continuous to academic/financial numbering | Unique receipt/SR, old printed numbers unchanged, year transition and concurrency safe |
| E2E-23 (TASK-008/026) | 2025-26 alumni historical class search and TC reprint | Old class/section preserved, closed year not writable, correct permitted report |
| E2E-24 (TASK-001) | Manager downgraded while signing a PDF download | Old session loses capability; private signed access cannot be refreshed in viewer role |

## 9. NFR inheritance from approved PRD (do not invent acceptance limits)

- Student exact-ID lookup **p95 <1 second** at 5,000 students/school; name search **p95 <1.5 seconds**, operator dashboard **p95 <3 seconds** at 2,000 students/school.
- **99.5%** monthly availability target, **at least 7 years** operational/financial/document retention subject to law, **WCAG 2.1 AA** contrast.
- New multi-charge posting, 5k promotion, bulk PDF and opening-balance backfill SLOs must be agreed from baseline. Record measured numbers; never label a proposed number as an existing PRD commitment.
- Domain-module boundaries, PostgreSQL authority, no cross-module repository reach-through, job-ID-only queue payloads, signed private file access and exact tenant isolation are mandatory.

## 10. Canonical Harness test gates

These project-repo planning cases are subordinate to the approved `jasiqlabs/jasiq-harness` product authority. Run `/jasiq-planning` revision, `/jasiq-stories`, `/jasiq-uiux` and `/jasiq-dld` review/approval against scope change first; exact tests in production DLD must trace to actual approved story/FR/BR IDs. Do not invent requirement IDs simply to get green checkmarks.

## 11. Existing functionality protection (hard QA gate)

Every task must rerun the applicable **BASE-01…BASE-16** user journeys defined in [REGRESSION-BASELINE.md](REGRESSION-BASELINE.md). Which ones are mandatory is provided per task in [TASK-IMPACT-MATRIX.md](TASK-IMPACT-MATRIX.md). This must include actual mobile/tablet/desktop user interactions, HTTP method/path/body/status compatibility, exact old monetary rows and receipt numbers, existing TC checksum and authorization/CSRF paths, and measured changed query performance against the same fixture. **No production-facing task is considered passed based only on Jest mocks or `npm test`**, because current web and worker test scripts are static QA.

The developer can rewrite UI/services/DB models if the approved user journey still works, the intended changes are explicitly documented, and no unrelated feature breaks. A new layout is not automatically a regression; missing validation, broken API, wrong business sums, privacy exposure, inaccessible controls or extra significant latency is. If an intentional contract change requires removal of an old route/UI action, first obtain owner approval and provide a compatibility or migration story; no surprise breakages.

**Minimum intern evidence per task:** BEFORE snapshots; focused new FE tests and browser manual walkthrough; existing route/API + DB tests; two-school and two-role negative tests; relevant NFR test numbers and query plans; AFTER snapshots; migration rollback proof; independent senior review for high-risk changes. Update the **one task tracker** with real outcomes and source of truth.
