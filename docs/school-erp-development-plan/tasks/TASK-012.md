# TASK-012 — Fee category definitions and effective billing rules

**Owner:** Fees · **Requires:** — · **Policy gate:** SPEC_SYNC_REQUIRED · **Review risk:** **HIGH** · **Live status/evidence:** [TASK-TRACKER](../TASK-TRACKER.md).

## 1. Complete task acceptance
**User story:** As a school operator I can fee category definitions and effective billing rules.

**Cases to demonstrate:** UC1: create registration rule ₹500 one-time and tuition ₹900 monthly; UC2: add exam fee ₹300 per approved term; UC3: edit fee rule for future period without changing paid old charges; UC4: disable fee category but historical balance remains visible. UC5: same school two classes have different tuition.

**Policy/eligibility:** Fee category is classification, fee rule controls who/when/how much; school-scoped configurable amounts and labels. Original monthly model must remain compatible. Category uniqueness by normalized code; no hardcoded charge amounts. Auto late fee forbidden without policy approval. Book/uniform not inventory.

**Concrete golden scenario:** Two schools can use same category code. Duplicate rule window returns 409; no rule or disabled category must not cause monthly legacy fees to vanish. This task is independently useful without any higher-numbered task or future service. If policies are unresolved, mark BLOCKED in the tracker; do not silently choose a finance/identity behavior.

## 2. Current code, domain ownership and DB DLD
**Inspect real existing files first:** `apps/api/src/modules/fees/application/configure-fee.service.ts`<br>`packages/validation/src/fees/fee.schema.ts`<br>`apps/web/src/app/operator/fees/setup/ui.tsx`<br>`prisma/schema.prisma`

**Schema and migration contract from requirement:** FeeCategory(id UUID,schoolId,code,displayName,chargeKind ONE_TIME|RECURRING|EVENT|MANUAL,status,version); FeeRule(id,schoolId,categoryId,academicSessionId?,classId?,amount numeric(12,2),effectiveFrom,validUntil?,recurrencePolicy,paymentDueOffset?,version,status); check amount>=0 for optional waiver and >0 for active billed rule per approved policy; UNIQUE school/category normalized code; indexed school,class,session,date. Legacy ClassFeeConfig mapped in compatibility read adapter.

**Detailed new DB behavior:** Add school-scoped FeeCategory and effective FeeRule entities with category code, ONE_TIME/RECURRING/EVENT/MANUAL, target class, optional session ID, effective date and Decimal amount. In legacy schools session targeting is optional; this task has no TASK-007 dependency.

**Schema release protocol:**
1. Capture current School A & B enrollment/fee/payment/TC counts, IDs and state in a **disposable cloned/seeded** environment. Prepare rollback that preserves old finance snapshots.
2. Expand schema with new tables/nullable references and same-school foreign keys. Write an additive Prisma migration plus any necessary reviewed SQL (partial uniqueness, date constraints). Do not force historical unknown values.
3. If backfill needed, run an idempotent preview and per-school reconciliation; do not convert uncertain legacy enrollment into invented academic dates or external collections into new SaaS receipts.
4. Protect old API via adapter; test old reads, writes, report totals and year/status before enabling new writer. Feature-flag per tenant where change alters financial or enrollment state.
5. Document verified counts, migration duration/locks, rollback/roll-forward plan and any discrepancy in single tracker. No hard DROP/RESET as rollback.

## 3. API / DTO / authorization DLD
**Original design contract proposal:** GET/POST/PATCH /operator/fees/categories, GET/POST/PATCH /operator/fees/rules with positive amount Zod, dates/year restrictions, role manager; GET list full rule projections for FE; 422 invalid recurrence/currency, 409 stale version/dup, 404 tenant conflict.

**Implementation contract:** implement typed request schema in `packages/validation` and response DTO in `packages/contracts`, no runtime-only `any` bypass; actor school from session, ADMIN route separately guarded, MANAGER permission on write and report-viewer only on explicitly permitted pure reads. School+record FK verified server-side; return **401** expired login, **403** missing ability, **404** foreign-school ID, **409** optimistic version/race/duplicate, **422** incorrect input, **503** unavailable queue/storage only when relevant. Preserve existing HTTP method/body/response or provide supported adapter tested before switching web clients. Writes CSRF + audit + request ID and idempotency where payment/year transition is involved.

**Concrete API behavior:** Create rule resolver with deterministic precedence (explicit class+session, class, school), no two overlapping ACTIVE rules of same priority. Guard edit with version token; do not retroactively reprice generated paid or pending dues.

## 4. Service/repository algorithm — implement in this order
1. Create rule resolver with deterministic precedence (explicit class+session, class, school), no two overlapping ACTIVE rules of same priority. Guard edit with version token; do not retroactively reprice generated paid or pending dues.
2. Adapt current ClassFeeConfig to remain source of existing monthly tuition; show it in new Fee Setup without duplicating or creating a second monthly charge. TASK-013 will later migrate ledger writers.
3. Create Category & Rule setup web screens: list, add, edit, disable with effective-date explanation and future-billing preview, not a misleading 'bill now' action.
4. Two schools can use same category code. Duplicate rule window returns 409; no rule or disabled category must not cause monthly legacy fees to vanish.

**Inter-module integration currently proposed:** Fees module owns rule resolution: choose one applicable rule by school+session+class+category+effective date, handle override precedence explicitly; billing engine FE-07 creates idempotent charge sourceKey; UI Fee Setup tab categories+rules, activate/deactivate with preview of who will be affected; dashboard aggregates through FeesPublicFacade.

**Failure handling:** Class/month rate change retroactivity must obey approved DLD frozen due snapshots; do not silently recalculate paid or prior generated due when editing rule. Safe path is adjustment with reason and audit if approved. Multiple event charges in same month should coexist without overwriting each other. Every mutation that spans modules is done through owned facade commands and a durable outbox/coordinator, not direct sibling-model SQL.

## 5. UI / navigation DLD
- Use existing operator/admin Next.js route, API client and design tokens. Do not hide old actions, invent an unavailable destination or make report navigation grant a forbidden action.
- State model: initial/skeleton → ready/empty → editing → validating → submitting → success or 409 stale/422 invalid or 503 retry. Retain user's input after recoverable failure; prevent double-submit.
- Form fields, labels, date formats, source-of-truth totals and role-based controls follow the task's contract above. Provide clear messaging for missing legacy mapping and prior paid records; no raw database enum/UUID where a human-readable label exists.
- Verify desktop (1366px), tablet (768px), mobile (360px), print when relevant, keyboard, labels/focus and long schools/student names. A redesign may change layout but must preserve old workflow end-to-end.
- **Exact UI and school examples:** Two schools can use same category code. Duplicate rule window returns 409; no rule or disabled category must not cause monthly legacy fees to vanish.

## 6. Executable FE / BE / NFR tests
**FE interactive cases:** TASK-012-FE01 user journey on 360/768/1366; TASK-012-FE02 invalid form; TASK-012-FE03 old user journey.
  
**BE unit, integration, DB and security cases:** TASK-012-BE01 service API; TASK-012-BE02 tenant isolation; TASK-012-BE03 transaction race.

**NFR, reliability, performance and privacy cases:** TASK-012-NFR01 load target; TASK-012-NFR02 privacy; TASK-012-NFR03 DB migration/rollback.

**Additional negative cases that must pass:** API called without CSRF; school B UUID from school A; wrong role with valid auth; duplicate retry; stale version; old record/empty nullable field; process crash during async step if used. Unit mocks are insufficient—test with real isolated PostgreSQL/Redis/file service where changed.

**Existing behavior regression mandatory:** BASE-05,09,10,12. Rerun relevant [BASE-XX workflows](../REGRESSION-BASELINE.md) before and after. No task is successful if the new behavior works but old user functionality breaks.

## 7. Completion evidence and rollout
Produce PR diff (source files/DTO/API), migration SQL, before/after screenshots and API snapshots, actual FE/BE/NFR logs, cross-tenant/money invariants, p50/p95 (where changed), previous document checksum if applicable, backup/recovery result and reviewer comment. **Only after approved integration** change the single tracker status to DONE. The task document itself has no mutable status.

## 8. Additional executable golden cases (test IDs & outcomes)

Use synthetic School A and School B, known requestId, stable baseline SHA and recorded before/after outputs. These supplement—not replace—Section 6 named cases:

| ID | Exact test action and assertion |
|---|---|
| TASK-012-FE04 | Configure tuition ₹900 monthly + registration ₹500 one-time; current month old tuition remains correct. |
| TASK-012-FE05 | Disable rule: future preview excludes new charges, historical paid lines unchanged. |
| TASK-012-BE03 | Existing ClassFeeConfig upsert and old fee generation produce identical amounts. |
| TASK-012-BE04 | Two overlapping rules of same precedence for class/category/month rejected at DB/service level. |
| TASK-012-BE05 | Viewer direct POST fee category returned 403; cross-school rule UUID returns 404. |
| TASK-012-NFR04 | Resolve 9 rules for 5k student charge candidates without N+1 and record query plan. |
| TASK-012-NFR05 | Undo incomplete category migration without dropping old ClassFeeConfig; no old data loss. |

Reviewer must link actual browser/API/DB/load evidence for every applicable row in the **one tracker**. A screenshot of the UI without checking the underlying DB/HTTP result is not a PASS.
