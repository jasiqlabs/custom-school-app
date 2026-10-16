# TASK-027 — Receipt and student-number sequence policies

**Engineer/domain owner:** School / Fees / Students. **Prerequisites (ALL already lower-numbered):** TASK-007, TASK-013. **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** Provide school-approved continuous, academic-year or financial-year series policies for receipt and Student ID/SR, without ever renumbering old evidence or mutating immutable UUIDs.

**Outside this task:** Do not change existing school series unless explicitly selected, and never relax current Student Code uniqueness due to sequence reset.

**School user story:** As school administrator, I can follow the school's agreed numbering sequence across academic and financial years while never changing an already issued student's identity or receipt.

**Real use cases and acceptance:** UC1: continuous receipt series increments beyond 2027; UC2: academic-year scoped series restarts at 00001 but prefix prevents collision; UC3: financial-year series uses Apr–Mar date boundaries; UC4: student auto-ID rolls over only if configured, never collides with existing studentCode; UC5: old printed documents keep original number after policy changes.

**Domain rules, authorization and scope:** Policy selection must be explicit: CONTINUOUS / ACADEMIC_YEAR / FINANCIAL_YEAR for receipts and separately for Student ID/SR; exact printed prefix, width and reset sequence are client decisions. Internal immutable UUID and `idempotencyKey` remain stable. No reuse of historical receipt numbers in same display scope; prevent current Student ID collision even after year reset.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** SchoolNumberingPolicy(schoolId,entityType RECEIPT|STUDENT_ID,seriesRule,prefixPattern,width,version,effectiveFrom,changedBy); NumberSequence(schoolId,entityType,seriesKey,lastValue) UNIQUE triple; receipt has frozen seriesKey, formattedReceiptNumber with unique school-scoped constraint; student identifier history continues current immutable technical FK. Index lookup for formatted numbers and history.

**API/contracts, DTO validation, errors and role scope:** GET/PATCH /platform/schools/:id/numbering-policies (platform owner or delegated school admin by approved role) {entityType,seriesRule,prefixPattern,width,version}; GET /operator/fees/numbering-preview?sessionId; student ID suggestion returns advisory only, allocator reserves during student create transaction.

**Backend transaction/workflow, module facades and frontend step-by-step state:** Sequence service obtains per-school+entity+series FOR UPDATE, computes seriesKey from selected session or Asia/Kolkata financial year, applies validated template then commits with payment/student transaction and audit. Web setup shows example 2026 vs 2027 outputs and warns that existing historical identifiers do not change. Legacy ReceiptSequence and StudentIdSequence migrated to CONTINUOUS policy with seeded lastValue, avoiding reissue.

**Concurrency/idempotency/recovery/correction edge cases:** If session year and financial year overlap, explicit policy wins. Multiple schools can share formatted receipt number only because school tenant scope differentiates them; in-school duplicate forbidden. Prefix edits cannot collide with old numbers; validate uniqueness on change.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** Sequence service obtains per-school+entity+series FOR UPDATE, computes seriesKey from selected session or Asia/Kolkata financial year, applies validated template then commits with payment/student transaction and audit. Web setup shows example 2026 vs 2027 outputs and warns that existing historical identifiers do not change. Legacy ReceiptSequence and StudentIdSequence migrated to CONTINUOUS policy with seeded lastValue, avoiding reissue.

**BE cases:** TC-CL06-BE01 100 concurrent unique receipts; BE02 duplicate Student ID prevented by DB; BE03 legacy numbers not reused; BE04 timezone boundary and year key; BE05 version change idempotent; BE06 unauthorized policy edit denied.

**NFR cases:** TC-CL06-NFR01 receipt allocator contention throughput and deadlock retry; NFR02 immutable document snapshot; NFR03 audit and recovery after crash; NFR04 no change to existing search performance.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
