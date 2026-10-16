# TASK-031 — PDF receipt download from payment history

**Engineer/domain owner:** Fees / Documents. **Prerequisites (ALL already lower-numbered):** TASK-030. **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** Offer authenticated Download Receipt PDF on payment history rows, using the **same receipt view model** as 2-copy print; support void/legacy receipts.

**Outside this task:** Do not replace existing View/Print with a download-only workflow; no bulk ZIP export unless separately approved.

**School user story:** An authorized operator opens payment history and downloads a verifiable receipt as a PDF instead of relying only on print dialog.

**Real use cases and acceptance:** UC1: click Download next to one payment, browser saves e.g. fee-receipt-000123.pdf. UC2: download a VOIDED receipt, clearly marked. UC3: report-viewer can only download if receipts explicitly included in approved reports. UC4: signed URL expires and retry renews after auth. UC5: foreign school payment denied.

**Domain rules, authorization and scope:** New per-payment download is in scope; not necessarily bulk ZIP/PDF or CSV export. Format must be same receipt view as FB-05. No public URL exposing student name/ID; output filename sanitized. Preserve current View/Print action.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** Reuse private SchoolFile of type RECEIPT and optionally ReceiptRender(jobId, paymentId, templateVersion, fileId, checksum,status) unique per frozen receipt version; if generated synchronously, no persisted file required but content must still be immutable. No new mutable money fields.

**API/contracts, DTO validation, errors and role scope:** GET /operator/fees/payments/:id/receipt.pdf with response application/pdf, Cache-Control private,no-store and Content-Disposition attachment; if async render use POST /operator/fees/payments/:id/receipt-render and authorized short-lived GET download/status; no anonymous file serving.

**Backend transaction/workflow, module facades and frontend step-by-step state:** History action cell adds Download button with loading/error and fetch as Blob/stream; server calls Fees ReceiptAssembler then versioned PDF renderer/worker. Store/retrieve via PrivateFileService after tenant and role check; generate URL with short TTL. One shared rendered data contract with FB-05 ensures print/download match.

**Concurrency/idempotency/recovery/correction edge cases:** If rendering pending show deterministic queue state; repeated download uses same snapshot and does not create duplicate receipt/payment; safari/mobile file behavior needs manual test; old payment may require legacy fallback data.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** TASK-031-FE01 verify PDF saved/open; FE02 receipt view and download totals equal; FE03 void watermark; FE04 spinner/error; FE05 Android Chrome, tablet and desktop, keyboard; FE06 expired URL retry.

**BE cases:** TASK-031-BE01 right MIME/filename/no-store; BE02 cross-tenant 404; BE03 unauthorized role 403; BE04 old/new payment render idempotent; BE05 storage failure/retry; BE06 signed URL owner verified.

**NFR cases:** TASK-031-NFR01 PDF generation/load test 50 concurrent; NFR02 private signed expiry; NFR03 size/charset/glyph assertions; NFR04 directory traversal filename injection denied.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
