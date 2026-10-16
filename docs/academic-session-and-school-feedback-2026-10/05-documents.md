# Document Issuance: Operator TC, Fee Clearance and Admit Cards

**Sources:** Chat feedback points 1–2 and page 1 (school codes on TC). **Commercial note:** Admit Card Generator (DC-03/04) is a separate paid change request; record and estimate it, but do not implement until commercial approval.

## DC-01 — Transfer Certificate in operator panel (P1)

**Requirement.** An authorized full operator can search student, preview and generate TC, track processing, list previous certificates and download/retry as permitted; existing platform-admin capabilities continue to work.

**DLD.**
- Reuse existing `TcService` and `TC_PDF` job flow and encrypted immutable snapshot; introduce school-scoped `/operator/transfer-certificates` controller guarded by `MANAGER` capability `tc:issue`, `tc:read`, `tc:download`, `tc:retry`.
- **Never trust schoolId from request** for operator controller; use `actor.schoolId`. Keep `/platform/schools/:schoolId/transfer-certificates` working.
- Refactor audit to use actual `actor.userType`; `TransferCertificate.issuedBy` continues to point to actor ID, independent of actor type. Fix job creation metadata likewise.
- Add Operator nav/page consistent with student/fees UI; show readiness errors for missing school logo, principal, signature; show queue/failed/completed states and safe retry.
- Implement FB-03 school codes in a bumped TC template snapshot/version. Previously issued PDFs and TC UUIDs are immutable.

**FE tests.** Search own students, issue preview, readiness prompt, job states, retry, download, old TC status, responsive and accessible.
**BE tests.** Authorized operator vs viewer; platform-admin old route; operator school scope; TC version/UUID uniqueness, one job per issue request, snapshot encryption, audit actor type.
**NFR tests.** PDF worker throughput, controlled retries, job queue reliability, file integrity, no publicly accessible files.

## DC-02 — Block TC issuance for pending school fees (P0)

**Requirement.** When an operator or platform admin tries to **generate a new TC**, the server refuses if student's eligible fee balance is pending (including prior months and older sessions). UI explains total and links to fees. Previously valid issued TCs remain downloadable regardless of later debt changes, unless separate revocation policy approved.

**DLD.**
- Introduce `StudentFeeClearanceService.getClearance(schoolId,studentId,asOfDate)` over FE-07 authoritative charges/payments; include all active unpaid/partially paid relevant categories and previous sessions, explicit exclusions only if approved.
- Call it in **shared** `TcService.issue` for both admin and operator routes *before* creating TC/job. Validate active session/student context and document prerequisites.
- Ensure issuance decision and record creation are transactionally consistent with fee ledger locks or a validated ledger version / repeat check. Disallow bypass from direct API, duplicate requests and background job entrypoints.
- Return domain error `ERR_FEES_PENDING_FOR_TC` with student identity, aggregate payable, optional safe month/category breakdown. Do **not** expose Aadhaar or unrelated student's records.
- Audit approved and denied issuance with actor/student/fee statement version and timestamp. Define escalation/fee waiver policy explicitly before adding any override.

**FE tests.** TC disabled/blocked for ₹1+ due and partial payments; allowed at ₹0; useful link to pending fee statement; retry after payment.
**BE tests.** Across 12 months and two years, unpaid tuition/books/late if eligible, cleared and waived balances, voided payment restores block, concurrent due/payment and TC create, direct admin API bypass attempt.
**NFR tests.** Clearance indexed (< agreed p95); double-issuance/idempotency stress; audit correctness, no stale cache, no tenant leak.

## DC-03 — Admit Card Generator (SEPARATELY CHARGED CR)

**Requirement.** Full operator can generate a student-specific Admit Card for a configured exam/term; preview/print/download with student, school, exam, session, class, candidate/roll no, examination schedule and school signatory as confirmed. No fabricated exam schedule.

**DLD.**
- Product decision required: whether exam metadata is managed by a minimal simple form or a future exams module. In this CR, favor **minimal exam metadata**: school-scoped `ExamEvent`/exam title, sessionId, class/section applicability, dates, venue, subject slots (if approved), optional instructions; no grading/result management.
- Add `AdmitCardIssue` (school, student, exam, actor, issuedAt, templateVersion, immutable encrypted snapshot, job/file/status) and `ADMIT_CARD_PDF` worker job; store privately, immutable downloads, safe retries.
- Add operator list/filter/select/preview/issue/download view, possibly per-student and batch issue **only if approved**. Reuse school branding and academic-session enrollment snapshots; require manager role, not report-viewer.
- Do not print Aadhaar by default. Use A4 and confirmed language/branding template.
- Keep separate schema/controller/facade from TC; share document readiness/worker primitives only where safe. Do not call a TC-specific job as a shortcut.

**FE tests.** Exam missing/valid, student not enrolled, same-named exam different school, date layout, print preview, batch status only if approved.
**BE tests.** Wrong exam/student/session, immutable version and duplicate requests, tenant permissions, queue retries, signed file download, input validation.
**NFR tests.** 500 student batch load only if enabled, secure document storage, A4 PDF visual goldens, accessible text, worker memory/performance.
**Gate:** No coding until the client confirms CR price and specification.

## DC-04 — Block Admit Card issuance for fee pendency (paid CR dependency)

**Requirement.** A new Admit Card is issued only when student meets configured fee-clearance rules. Do not assume **all annual fees** must be prepaid; cutoff may depend on exam date, term or approved policy.

**DLD.** Reuse **DC-02** clearance service with a configurable policy `purpose: ADMIT_CARD`, `examId`, `asOfDate`, `allowedChargeCategories` and optionally cutoff, all validated server-side. Check before generating batch item (per student), return blocked list and outstanding amount without leaking private data.
**FE tests.** One blocked student among batch; clear dues then issue; incorrect year; as-of date cutoff; no edit-role bypass.
**BE tests.** Direct API blocked, prior-year balances and voids, concurrent payment/generation, same-key idempotency, policy version in snapshot.
**NFR tests.** Bulk clearance query (avoid N+1), bounded partial failures, stable results and audited denials.
**Gate:** Included in separate Admit Card CR unless client explicitly changes commercial agreement.

## DC-05 — Document lifecycle, audit and versioned PDFs (P1)

**Requirement.** All newly generated TCs and Admit Cards, and downloadable fee receipts, must be reproducible and auditable; unchanged old generated files remain accessible to authorized users.

**DLD.** Create/standardize document manifest (schoolId,type,referenceId,studentId?,sessionId?,templateVersion,issueActorType,issueActorId,issuedAt,status,immutableSnapshotFingerprint,fileId,checksum,eligibilityCheckId?). Use existing TC snapshot encryption and SchoolFile controls as building blocks. Never mutate previously issued PDFs in-place after changing template or profile. Preserve reprint vs reissue semantics; for PDF queue retries reuse the frozen snapshot; role/school authorization at list/download. Make financial receipt status VOIDED visible without erasing original. Introduce metadata only where not already present (avoid duplicating TC).
**FE tests.** List/status/reprint, graceful expired link retry, correct historic school header, printable multi-page.
**BE tests.** Snapshot integrity, retry doesn't apply new fees/branding, old file still works, cross-tenant download denies, issue vs reissue audit, checksums.
**NFR tests.** Short-lived signed URLs, secure file retention, backup/restore of encrypted snapshot key material, queue observability, PDF generation and failure rate SLO tracking.

## Mandatory API assertion: no client-side fee bypass

No new TC or Admit Card job can be queued by calling the issuance endpoint directly while clearance is false. The **shared server issuance service**, not a button-disable rule, is the authority. Any batch processing must re-check status before each actual issue operation according to a documented transactional concurrency strategy.
