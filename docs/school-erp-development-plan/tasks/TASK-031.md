# TASK-031 — PDF receipt download from payment history

**Owned by:** Fees / Documents · **Requires:** TASK-030 · **Decision gate:** SPEC_SYNC_REQUIRED · **Reviewer tier:** **MEDIUM** · **Only execution state:** [Task Tracker](../TASK-TRACKER.md)

## 1. Requirement and acceptance
**Business story:** An authorized operator opens payment history and downloads a verifiable receipt as a PDF instead of relying only on print dialog.

**Operator use cases:** An authorized operator opens payment history and downloads a verifiable receipt as a PDF instead of relying only on print dialog.

**Approved policy still to reconcile:** New per-payment download is in scope; not necessarily bulk ZIP/PDF or CSV export. Format must be same receipt view as FB-05. No public URL exposing student name/ID; output filename sanitized. Preserve current View/Print action.

**Concrete acceptance scenario:** Own-school download matches printed receipt totals, new and old payment IDs; foreign school 404, report-viewer 403 unless approved report export, expired link cannot bypass auth. **Never invent commercial approval** for TASK-034/035; remain blocked until written paid CR acceptance and confirmed exam template.

## 2. Domain and database DLD
**Main branch code to read:** `apps/api/src/modules/fees/controllers/fees.controller.ts`<br>`apps/web/src/app/operator/fees/history/ui.tsx`<br>`apps/api/src/platform/files/private-file.service.ts`

**Proposed persisted fields/constraints:** Reuse private SchoolFile of type RECEIPT and optionally ReceiptRender(jobId, paymentId, templateVersion, fileId, checksum,status) unique per frozen receipt version; if generated synchronously, no persisted file required but content must still be immutable. No new mutable money fields.

**Deep design:** Expose secure GET /operator/fees/payments/:id/receipt.pdf using existing authenticated Fees receipt view from TASK-030. Generate/stream PDF and proper Content-Type/Disposition, no-store, sanitized filename; only via school/role guarded domain API.

**Migration and history protections:** new nullable or versioned fields with tenant-scoped unique/FK constraints, no deletion of old TransferCertificate encrypted snapshot, FeePayment, original receipt number, file SHA or academic class history. Renderer must dispatch by stored templateVersion; role+student+school authorization before signed file. Migration rehearsal includes old v1 PDF, file/crypto key rotation and same-school signed download after a deployment with new worker code. If paid CR not approved, don't add JobType or FileType for Admit Cards.

## 3. API / DTO / security DLD
**Original endpoint proposal:** GET /operator/fees/payments/:id/receipt.pdf with response application/pdf, Cache-Control private,no-store and Content-Disposition attachment; if async render use POST /operator/fees/payments/:id/receipt-render and authorized short-lived GET download/status; no anonymous file serving.

**Backend method rules:** 401 invalid session; 403 missing MANAGER/report capability; 404 foreign school/student/issue; 409 pending eligible fees, stale issue state or duplicate mismatch; 422 invalid template/year; 503 transient storage/queue. Server validated school actor and CSRF; GET downloads authenticated, never direct public blob. DTO snapshots include issuer/type, template version, issue number and frozen data, never raw Aadhaar by default. Reuse existing platform TC `/platform/schools/:id/transfer-certificates` routes without breaking any old caller, and use new `/operator/transfer-certificates` only after prior service gate is implemented.

**Concrete API implementation:** If async render or stored file, create idempotent receipt render job keyed to payment+template version and store private school file with SHA. Do not create extra FeePayment or receipt number on repeat download. When using async workers send **only {jobId}** and reload issue snapshot on worker, never pass student identity to queue.

## 4. Service transaction and frontend sequence
1. If async render or stored file, create idempotent receipt render job keyed to payment+template version and store private school file with SHA. Do not create extra FeePayment or receipt number on repeat download.
2. Web history row gets Download PDF alongside existing View/Print, loading/progress/retry and accessibility. Blob objectURL revoke, Android/mobile browser save behavior and expired signed URL handling verified.
3. Keep voided receipt retrievable with clear VOIDED label and original amounts/reference intact. Legacy receipt renders through compatible v1 adapter; do not overwrite old print.
4. Own-school download matches printed receipt totals, new and old payment IDs; foreign school 404, report-viewer 403 unless approved report export, expired link cannot bypass auth.

**Concurrency/error handling:** If rendering pending show deterministic queue state; repeated download uses same snapshot and does not create duplicate receipt/payment; safari/mobile file behavior needs manual test; old payment may require legacy fallback data. Preserve original document/receipt issued facts. A failed render retry is the **same issuance** with the same snapshot; an intentional reissue receives a **new** request key and issue identity. Signed URLs expire and cannot be renewed after role revocation.

**UI states and tests:** READY/preconditions → review → confirmed/new issue → QUEUED → COMPLETED/FAILED → Download/Retry. Show correct school/header/class, human-friendly balance error, loading, empty, protected report role, 360/768/1366 responsive layout and A4 PDF typography (₹ glyph and long lines). Never show a working-looking Generate button if backend/CR isn't ready.

## 5. Explicit FE / BE / NFR testing
**FE interaction cases:** TASK-031-FE01 normal issuance/print; TASK-031-FE02 invalid state; TASK-031-FE03 responsive and old flow.

**BE/API/tenant/SQL cases:** TASK-031-BE01 API state, authorization, tenant; TASK-031-BE02 retry idempotency; TASK-031-BE03 old issue compatibility.

**NFR/security/worker cases:** TASK-031-NFR01 50 parallel jobs/downloads, TASK-031-NFR02 private files/PII, TASK-031-NFR03 worker crash/retry.

**Extra mandatory test:** Own-school download matches printed receipt totals, new and old payment IDs; foreign school 404, report-viewer 403 unless approved report export, expired link cannot bypass auth. Also send direct request from unauthorized school and report viewer; expire session during file generation; restart worker on PROCESSING; compare original TC/receipt checksums and new generated PDF text/golden snapshots; verify audit outbox not duplicated. For fee clearance, run 20 concurrent charge/payment/void vs issue attempts and prove no window to issue on stale financial state.

**Existing functionality protected:** BASE-10,11,14,15,16; compare BEFORE/AFTER [BASE cases](../REGRESSION-BASELINE.md): previous platform-admin TC, old fee payment/receipt/void and download, school logo/signature, sessions and private storage. Static QA alone does not count as PDF/browser proof.

## 6. Review and release
Document exact new/legacy endpoints, typed request/response, migration SQL and rollback, per-school issue counts and immutable file hashes, browser screenshots, actual Jest/integration/api tests, p50/p95 rendering/storage/queue load, and security tests. Attach evidence to **the single task tracker**, not to mutable status lines here. This change is only DONE after independent senior review and approved integration; no task should depend on a higher-numbered route or module.
