# TASK-028 — Document snapshots, secure workers and versioned files

**Owning module:** Documents / Foundation · **Prerequisite IDs:** — · **Policy/spec gate:** SPEC_SYNC_REQUIRED · **Reviewer risk:** **HIGH** · **Status:** only in [TASK-TRACKER.md](../TASK-TRACKER.md).

## 1. What the user receives (not just a backend change)
**Operator/school story:** As an operator, I can retrieve previously issued official documents even after school info or template changes and can safely retry a failed render, without leaking private records.

**Existing requirement acceptance:** UC1: change school principal after TC issued, old TC remains original; UC2: queued PDF worker restarted and renders same issue, not another; UC3: old encrypted TC snapshot key version still decrypts; UC4: expired signed download requires fresh authorization; UC5: new renderer can coexist with legacy template version.

**Business policies and scope limit:** One authoritative issue per domain: TC owner for TC, Fees for receipts and later approved Admit Cards for card. No parallel duplicate master document entity; optional read-model manifest only. Only jobId in BullMQ payload, frozen issue snapshot and content SHA256; role/tenant checked before private download. No code should invoke any higher-numbered unfinished task; where future work is expected, expose only a tested extension point now.

**Golden demonstration:** Change school principal after TC issued, then retry old job: old TC v1 still uses frozen old name. Kill/restart worker, verify no duplicate TC/files and no leaked PII in job logs.

## 2. DLD — Domain schema and migration

**Existing source to inspect:** `apps/api/src/platform/files/private-file.service.ts`<br>`apps/api/src/platform/jobs/job.service.ts`<br>`apps/api/src/modules/platform-admin/tc/tc.service.ts`<br>`apps/worker/src/tc-pdf-builder.ts`

**Proposed persisted records and invariants:** Versioned DocumentManifest read model if needed {schoolId,domainType,domainIssueId,templateVersion,actorType,actorId,snapshotHash,fileId,status,attempts,checksum,createdAt} unique school+type+issue; existing TC encrypted snapshots and SchoolFile preserved. For new receipts expose versioned renderer, not mandatory new duplicated money rows; actor/name snapshot plan for later receipt UI.

**Concrete domain model:** Audit actual TC encrypted snapshot, PrivateFileService, JobOutbox and BullMQ worker before adding optional abstraction. Preserve existing TransferCertificate and SchoolFile as source of truth; no duplicate DocumentManifest unless demonstrated need.

**DB release sequence:** EXPAND nullable/new schema and composite school foreign keys; preserve `Student.id`, existing enrollment/payment/TC/file IDs; verify old code compatibility in isolated two-school fixture; deterministic historic backfill with approved verified mapping; compare before/after counts, affected monetary totals, file checksums. Apply partial unique index and date overlap constraints in reviewed Prisma+SQL migration. If already posted payments or issued certificates exist, use audited forward correction—not deleting finance tables or rolling back student identities.

## 3. DLD — API and public facade contracts

**Existing requirement HTTP design:** Reuse owning-domain GET status/download and POST retry-render only on FAILED with expectedVersion. Foundation PrivateFileService provides authorizeThenSign({actor,schoolId,domainRef,capability,ttl}), job dispatch {jobId}; typed 404 other school, 403 viewer denied, 409 invalid retry state, 503 storage unavailable.

**Typed API requirements:** Request JSON uses school-scoped IDs, ISO business DATE and version/idempotency; for manager actions enforce OperatorGuard + capability + CsrfGuard, for Platform Admin guard separately, for downloads enforce current school/signed-file authorization. 401 unauth, 403 forbidden, 404 foreign object, 409 stale/concurrent/illegal transition, 422 invalid date/class, 503 job/outbox unavailable. Old URLs/requests continue through compatibility adapters and are tested. Public domain facade owns reads/mutations; orchestrator coordinates via opaque port (no cross-owner Prisma table writes).

## 4. DLD — Implementation sequence and UI screens

1. Introduce versioned PDF renderer registration for TC (v1 and new templates) and shared worker error/lease/retry policy with jobId-only queue payload. File signed URLs issued only after domain object and current actor permission validated.
2. On issue/create retry, freeze issue-time school/student metadata + templateVersion, encrypt keyVersion, then enqueue job through auditable outbox. Worker reloads snapshot, renders, SHA256 validates, stores private file and marks status atomically with bounded retries.
3. Expose clear QUEUED/PROCESSING/FAILED/COMPLETED status and authorized Retry/Download in existing platform-admin TC UI without changing its business issue contract. No new TC access for operator yet.
4. Change school principal after TC issued, then retry old job: old TC v1 still uses frozen old name. Kill/restart worker, verify no duplicate TC/files and no leaked PII in job logs.

**Additional service behavior in original scope:** Domain controller creates versioned frozen issue+outbox in local transaction, worker receives {jobId}, reloads database snapshot and private branding, renders PDF by pinned template version, hashes content, uploads tenant-private file, atomically marks success; bounded retry on storage failure from same source; on read validate file/actor/tenant and present safe status. Keep old TC and receipt route behavior stable.

**Failure and retry behavior:** Immutable old PDF must not be silently rebuilt with current branding. Reprints distinct from new issuance; voided receipts add visible void state via versioned view not past payment rewrite. Key rotation and backup/restore test, no sensitive data in job payload.

**UI state matrix:** loading, empty, ready, editing/review, submitting, PREPARED/QUEUED/CLOSING where appropriate, success, stale conflict, retryable failure, archived/read-only. Show accurate school/year/class and correct current vs historic context. No misleading 'completed' status while async steps still running. Validate at 360px/768px/1366px; accessible labels/keyboard and permission-correct navigation. Any redesigned layout must allow previous workflows.

## 5. FE/BE/NFR test plan (execute, do not just list)

**FE:** TASK-028-FE01 happy path; TASK-028-FE02 error; TASK-028-FE03 old UI preserved.

**BE unit/API/SQL + authorization:** TASK-028-BE01 API; TASK-028-BE02 school isolation; TASK-028-BE03 idempotency.

**NFR performance/worker/privacy:** TASK-028-NFR01 p95 performance; TASK-028-NFR02 recovery; TASK-028-NFR03 security.

**High-risk task-specific hard assertions:** Change school principal after TC issued, then retry old job: old TC v1 still uses frozen old name. Kill/restart worker, verify no duplicate TC/files and no leaked PII in job logs. For async tasks kill the worker after each step, resume without duplicates. For academic transitions verify old ledger origin/snapshot and no phantom active enrollment. For files verify old PDF SHA and signed URL expiration. For numbering verify concurrency uniqueness. Test invalid/stale versions and cross-school IDOR with real PostgreSQL transactions.

**Required existing-product regression:** BASE-14,15,16 (see [REGRESSION-BASELINE](../REGRESSION-BASELINE.md)). Capture BEFORE/AFTER screen recordings or screenshots and matching API/DB outputs.

## 6. Definition of Done and safe implementation gate

The task works **alone plus listed earlier prerequisites**; no later CTA/API is needed. UI, backend and NFR evidence has been executed, not inferred from Jest mocks. Database migration is rehearsed without destructive resets and approved rollback/roll-forward plan. Original login, admission, class changes, monthly fees, collections/void, reports, transport and platform TC remain functional as applicable. Reviewer must sign off P0 changes, and only then update the **one tracker** with PR, test results, baselines, review and eventual DONE after approved merge.

## 8. Additional exact acceptance and regression test matrix

Use the synthetic two-school fixtures and original-function BASE-XX journeys. Record **actual** browser/API/DB/NFR results, not planned/assumed PASS. These are separate from the earlier FE/BE/NFR scenarios:

| Test ID | Preconditions/action → required assertion |
|---|---|
| TASK-028-FE04 | Render old TC v1 and new version from frozen snapshots after branding changes. |
| TASK-028-FE05 | Force worker render failure; retry same issue and show accurate status. |
| TASK-028-BE04 | Existing admin TC issue/list/download/retry and private logo/signature untouched. |
| TASK-028-BE05 | Two workers race same jobId: one stored final file/issue record. |
| TASK-028-BE06 | Expired signed link and viewer/foreign-school download fail closed. |
| TASK-028-NFR04 | 100 job burst/50 download concurrency memory and queue p95 measured. |
| TASK-028-NFR05 | Encryption key v1 retained; old ciphertext decrypts and SHA256 unchanged. |

Every failed protected BASE flow is a regression regardless of whether the new feature passes. For commercial Admit Card tasks, test execution itself remains blocked before signed CR approval.
