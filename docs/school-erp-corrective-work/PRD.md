# School ERP — Corrective PRD

**Baseline:** `main@519d60b9769fc5183e6cdbf9728739330ec8cdb0`, reviewed 30 October 2026.  
**Type:** Fix and complete the existing School ERP. No new product or independent feature programme.  
**Authority:** Original `docs/school-erp-development-plan/` requirements and approved JASIQ Harness PRD/HLD/UIUX/DLD; this document records **source-review gaps**, not approval of unresolved product policies.  
**Implementation:** [DLD.md](DLD.md) · **Single corrective status tracker:** [TASK-TRACKER.md](TASK-TRACKER.md).

## 1. Goal and scope

Complete the working **Web + API + DB + worker** user journeys across the original 35 requirements, correct financial/security faults and preserve current schools' data and workflows. **Refactoring, redesign and code replacement are allowed, but no supported existing functionality may break.**

Successful delivery means: school onboarding; manager/report-viewer segregation; admission and effective-dated class history; transport; multi-category fee setup, assessment, collection, partial/void and arrears; correct year rollover; previous-year records and opening balances; receipts/TCs; and exam/admit cards **only within approved commercial scope**. Every finished task includes its actual browser UI, API/DB behavior, NFR and old-flow regression evidence—not a future UI integration task.

### Non-breaking contract

- Existing platform/admin and operator login, school activation, students/import, classes, monthly FeeDue and FeePayment, transport, reports/exports, receipt/void and v1 TC must keep working during migration.
- Preserve IDs, receipts, encrypted student data, old TC PDF bytes/snapshots and audited money. **No production reset, guessed historical years, duplicate charges, retroactive receipt edits, or silent write-offs.**
- Operator schoolId and permission always verified on server. No read operation should create/update financial records. Cross-tenant IDs and private links denied.
- Financial changes reconcile to **₹0.00 discrepancy** between original and new accounting models. Old student arrears remain payable after exit; future charges stop according to the approved date policy.
- A task is releasable with only its lower-numbered prerequisites. No fake or disabled “completed” screens, no future endpoint required to finish an earlier task.

## 2. Source-audit findings to resolve

**Classification:** C = behavior verified in source; G = required workflow/implementation not located; V = hypothesis/coverage risk needing real tests. Severity is prioritization, **not proof a real-world exploit or incident occurred**. For multi-file findings the cited file is a starting point, not the complete set.

| IDs | Classification and finding | Primary code |
|---|---|---|
| SEC-01 C | Transport controller class-level read capability permits writes without explicit write decoration; verify and deny REPORT_VIEWER | `transports.controller.ts`, `capability.guard.ts` |
| SEC-02 C | Viewer has `students.read` while GET profile returns family/contact data | `capability.guard.ts`, `search-students.service.ts` |
| SEC-03 V | Other methods, exports, downloads, role-cache and cross-school guard coverage | all Nest controllers; web shell |
| SEC-04 V | FeeCharge/allocation foreign-key school relationships may require composite isolation enforcement | `prisma/schema.prisma` |
| FIN-01 C | FeeCharge payment balance read/update is not consistently locked across parallel writes | `collect-payment.service.ts` |
| FIN-02 C | Void assumes legacy dueId and does not reverse multi-charge allocations | `void-payment.service.ts` |
| FIN-03 C | Pending-fee GET and summary reads can generate financial dues | `query-pending-fees.service.ts`, Fees facade |
| FIN-04 C | Existing Platform Admin TC issue bypasses required fee clearance | `tc.service.ts` |
| FIN-05 C | Admit-card issue uses a preflight fee read without the same transaction lock | `admit-cards.service.ts` |
| FIN-06 C | Unchecking Books/Uniform can delete unpaid charges instead of recording correction | `update-student-profile.service.ts` |
| FIN-07 C | Existing idempotency-key replay is not proven to check canonical request hash | `collect-payment.service.ts` |
| FIN-08 C | Fee posting/reporting performs arithmetic via JavaScript Number on Decimal values | fee calculation and collection services |
| FIN-09 V | Old FeeDue, new FeeCharge, allocations, void and exports may be double-counted or diverge | fee read/write services; Prisma |
| FIN-10 C | Pending report loops students and assesses dues sequentially | `query-pending-fees.service.ts` |
| FIN-11 V | Class/date/transport changes may assess using latest rather than historical eligibility | `generate-dues.service.ts` |
| FIN-12 G | Audited fee adjustments and external opening-balance import need completing | fees schema/services; import screens |
| FIN-13 C | CollectPayment rejects INACTIVE students with legitimate previous-year arrears | `collect-payment.service.ts` |
| FIN-14 C | Pending report filters ACTIVE only and can omit old unpaid balances of exited students | `query-pending-fees.service.ts` |
| FIN-15 C | Fee assessment automatically reactivates a disabled TUITION category | `generate-dues.service.ts` |
| ACAD-01 C | Academic session close does not stage/finalize promotions with conflict review | `academic-sessions.service.ts` |
| ACAD-02 G | Coordinated exit/pass-out/re-admission preserving history and debt | `change-student-status.service.ts` |
| ACAD-03 V | Legacy enrollment mapping, history and year-scoped reports need real-data verification | enrollment service, queries |
| DOC-01 G | Versioned school-identifier TC, operator TC, two-copy receipt and standalone receipt PDF incomplete | TC/fees controllers, worker and web |
| DOC-02 G | Configurable receipt and student number series absent | number allocators, school settings |
| EXAM-01 C | Exam candidate clearance starts unbounded parallel per-student checks | `exam-contexts.service.ts` |
| EXAM-02 V | Bulk issuance, job replay and concurrent fee clearance need DB/worker tests | `admit-cards.service.ts`, worker |
| WEB-01 C | Admission UI permits non-CLOSED years; server also permits DRAFT | students/new UI, admit service |
| WEB-02 C | Payment UI regenerates idempotency key after retry | fees/collect UI |
| WEB-03 C | Admit-card UI can announce “PDF ready” before rendering COMPLETED | exams/admit-cards UI |
| WEB-04 V | Student/year navigation, status/errors, transport roles and stale browser responses need interaction tests | student, transport, academics UI |
| WEB-05 G | Historical-year fee report/print consistency and receipt PDF parity incomplete | fees/pending/history/collect UI |
| WEB-06 V | Import error workbook raw API URL must be validated on deployed web/API origins | students/import UI |
| WEB-07 C | Collect Fees UI disables payment for inactive pupils with old arrears | fees/collect UI |
| OPS-01 V | Migrations need real existing-data rehearsal and recovery verification | `prisma/migrations`, deploy scripts |
| OPS-02 V | Web and worker test scripts run static QA, not interactive/browser/queue integration | web/worker package.json |
| OPS-03 V | Export limits, SQL, cache scope, worker throughput and operational telemetry need measurement | dashboard, files, worker, reports |

**36 findings** are grouped into **14 cohesive end-to-end corrective tasks** in the tracker. This is a static audit; runtime testing may find additional defects. Do not mark V findings “confirmed” until reproduced.

## 3. Required outcomes

1. **Security:** All state-changing APIs require explicit write capabilities (including Transport); REPORT_VIEWER sees only approved reports and privacy-safe data. Keep full manager functionality.
2. **Finance:** Every assessment/pay/void/adjustment/TC-or-Admit clearance uses a shared student-scoped transaction boundary. Monetary values are exact Decimal/paise; same idempotency key with different payload is rejected, retry returns original receipt; void restores every original charge. Viewer/report GET/export performs **zero financial writes**.
3. **Fees and students:** Academic-year and effective-date eligibility obeys confirmed policy; DRAFT-year admission denied; disabled fee settings respected; leaving stops future fees/transport without erasing old collectible arrears; re-admission reuses Student UUID.
4. **Academic year:** Prepare/review promotion, repeat and pass-out decisions, safely finalize year transition with idempotent recovery; old-year fees and class history remain readable.
5. **History/import:** Accurate cross-year reports and external opening-balance import with provenance, no fabricated SaaS payment/receipt, resumable job and discrepancies surfaced.
6. **Documents:** Two labelled copies of the **same immutable** payment receipt, PDF download from history, optional numbering policy, and old TC v1 downloadable unchanged. New TC issuer for manager shares fee clearance and versioned school identity snapshot.
7. **Exams:** Preserve existing exam context/admit-card scope; enforce safe eligibility, bounded bulk work, precise QUEUED/COMPLETED status, private file access. No marks/results subsystem.
8. **NFR/UX:** Test all affected web routes at 360/768/1366 and all actual API/DB/worker paths. Existing student lookup and dashboard p95 targets remain baseline, not assumed pass; new paths measured against reviewed budgets.

## 4. Product decisions and scope boundaries

Do **not** choose new fees, grace periods, prorating, category exceptions for TC, legacy-year mappings, re-entry registration fee or numbering format without owner approval. These are documented in the original [DECISIONS.md](../school-erp-development-plan/DECISIONS.md). The existing Admit Card feature must not be expanded beyond approved **paid change request**; security fixes to existing code still require testing. Do not introduce inventory/warehouse, full exams/results, attendance, payroll or unrelated products.

## 5. Acceptance and sign-off

For **each** corrective task: (a) before/after existing user journey and API/DB proof, (b) executed named FE browser, BE/integration, and NFR/security/concurrency cases, (c) school A/B + manager/viewer negative tests where applicable, (d) schema expand/reconcile/restore when applicable, and (e) senior review for auth/money/academic/TC/private files. No task is DONE because code exists or unit mocks passed.

**Release gate:** 0 open P0 defects, reconciled payments and receipts to ₹0.00, old data/files preserved, all original 35-task functionality either proved or explicitly dispositioned with product approval, production-like staging migration and workload results reviewed. No main merge or production release is authorized by this document alone.
