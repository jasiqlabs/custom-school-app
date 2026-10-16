# TASK-030 — Two-copy itemized fee receipt and collector snapshot

**Engineer/domain owner:** Fees / Documents. **Prerequisites (ALL already lower-numbered):** TASK-013, TASK-027, TASK-028. **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** Produce receipt Office Copy and Student Copy, all fee components, actual collecting operator full name, currency ₹ and totals using immutable per-payment allocations.

**Outside this task:** This delivers current View/Print user experience; PDF download action in Payment History is TASK-031.

**School user story:** A fee collector must print a professional two-copy receipt showing school header, fee components, paid/due summary, who collected payment and correct currency.

**Real use cases and acceptance:** UC1: new fee payment spanning registration and monthly tuition prints Office Copy and Student Copy with identical receipt number and total. UC2: exact operator full name appears on both copies, not email or stale name. UC3: voided receipt is clearly marked VOIDED. UC4: legacy single-month receipt still prints. UC5: 20 fee lines wrap without clipping, amount in words matches paise.

**Domain rules, authorization and scope:** One immutable payment receipt, two named copies in one PDF/print view; currency glyph presumed ₹ but PDF source text extracted '?' — confirm before template approval. Never fabricate principal signature. Historical receipts remain meaningful even if collecting operator changes name/deletes account. Separate issued receipt vs outstanding at time of print to avoid today's balance distorting old receipt.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** Add FeePayment.collectorNameSnapshot varchar(255) optional, receiptTemplateVersion, schoolBrandSnapshot? as versioned encrypted/JSON metadata where appropriate; allocation snapshot includes category/charge period, gross, concession, fine and allocated paid; aggregate amounts derive immutable receipt snapshot. Existing FeePayment.createdBy UUID resolves legacy operator name if still present, with historical fallback.

**API/contracts, DTO validation, errors and role scope:** Extend GET /operator/fees/payments/:id/receipt with versioned ReceiptViewDto {school,receiptNumber,issuedAt,studentSnapshot,collectedBySnapshot,rows:[{category,period,assigned,concession,fine,received}],totals:{assigned,discount,net,paidThisReceipt,paidToDate,balanceAsOfReceipt},status}. Auth manager or explicitly approved report access, no-store, school scope.

**Backend transaction/workflow, module facades and frontend step-by-step state:** BuildReceiptDto moves to one FeesOwned ReceiptAssembler; do not duplicate computation in React. Next.js one shared ReceiptPrint component for collection/history, CSS @media print A4 with explicit page breaks: Office Copy header dark/navy, Student Copy green per sample; operator name and amount in words. Always include print-safe ₹ font/glyph and 'Copy' labels; void state watermark. Use versioned renderer for legacy records.

**Concurrency/idempotency/recovery/correction edge cases:** One payment can allocate across many fee charges FE-07; show each row without double counting concessions; void prints original data plus void metadata, not zero paid. Long school address/signature, logo aspect ratio, browser PDF print differences.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** TASK-030-FE01 snapshot render both copies; FE02 print dialog shows no navigation and correct A4; FE03 ₹ glyph on Chrome Android/desktop; FE04 wrong number/void display; FE05 1/5/25 items, long names; FE06 amount-in-words test ₹1, ₹1.50, ₹99999.99.

**BE cases:** TASK-030-BE01 receipt totals = allocations; BE02 collectedBy ID from session, cannot spoof; BE03 legacy collector deleted fallback; BE04 frozen as-of payment data; BE05 school tenant download/receipt 404; BE06 void integrity.

**NFR cases:** TASK-030-NFR01 golden A4 PDF visual snapshots with 1, 8 and 25 fee rows; NFR02 Unicode ₹ and amount-in-words extraction; NFR03 50 concurrent receipt render/prints with bounded memory; NFR04 sensitive data never exposed on public file path; NFR05 print accessibility and browser no-clipping.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
