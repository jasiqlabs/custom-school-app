# TASK-010 — Current-year context in existing student screens

**Owner:** Web / Students · **Requires:** TASK-007, TASK-008 · **Policy gate:** SPEC_SYNC_REQUIRED · **Review risk:** **MEDIUM** · **Live status/evidence:** [TASK-TRACKER](../TASK-TRACKER.md).

## 1. Complete task acceptance
**User story:** As a school operator I can current-year context in existing student screens.

**Cases to demonstrate:** UC1 current active year defaults in directory; UC2 choose 2025–26 and see historic class; UC3 direct shared link with foreign-school year rejected; UC4 reload retains selected year; UC5 archived student view allows no edit.

**Policy/eligibility:** Only Student screens are activated in this increment. No fee statement/report selector dependence on later tasks. A shared validated school year route/query contract is established for future extension, but does not call future modules.

**Concrete golden scenario:** Prove old /operator/students route still works with no year param; year-specific class counts and profile match enrollment history. This task is independently useful without any higher-numbered task or future service. If policies are unresolved, mark BLOCKED in the tracker; do not silently choose a finance/identity behavior.

## 2. Current code, domain ownership and DB DLD
**Inspect real existing files first:** `apps/web/src/app/operator/students/ui.tsx`<br>`apps/web/src/app/operator/students/[id]/ui.tsx`<br>`apps/web/src/features/students/api/students-api-client.ts`

**Schema and migration contract from requirement:** No new DB tables beyond TASK-007/008; add school+academicSessionId indexes on student directory queries where required. Safe legacy context for schools without migrated enrollment.

**Detailed new DB behavior:** Create shared year-selector UI with URL query param `academicSessionId` on student directory/profile and admission print only; bind to server validated list/current year. Do not globally inject into fee reports that are not year-aware yet.

**Schema release protocol:**
1. Capture current School A & B enrollment/fee/payment/TC counts, IDs and state in a **disposable cloned/seeded** environment. Prepare rollback that preserves old finance snapshots.
2. Expand schema with new tables/nullable references and same-school foreign keys. Write an additive Prisma migration plus any necessary reviewed SQL (partial uniqueness, date constraints). Do not force historical unknown values.
3. If backfill needed, run an idempotent preview and per-school reconciliation; do not convert uncertain legacy enrollment into invented academic dates or external collections into new SaaS receipts.
4. Protect old API via adapter; test old reads, writes, report totals and year/status before enabling new writer. Feature-flag per tenant where change alters financial or enrollment state.
5. Document verified counts, migration duration/locks, rollback/roll-forward plan and any discrepancy in single tracker. No hard DROP/RESET as rollback.

## 3. API / DTO / authorization DLD
**Original design contract proposal:** GET /operator/academic-sessions/current and optional ?academicSessionId on student list/profile/admission-form history endpoints. Require server validation of school ownership and ability to access CLOSED year; default DB ACTIVE not browser current date.

**Implementation contract:** implement typed request schema in `packages/validation` and response DTO in `packages/contracts`, no runtime-only `any` bypass; actor school from session, ADMIN route separately guarded, MANAGER permission on write and report-viewer only on explicitly permitted pure reads. School+record FK verified server-side; return **401** expired login, **403** missing ability, **404** foreign-school ID, **409** optimistic version/race/duplicate, **422** incorrect input, **503** unavailable queue/storage only when relevant. Preserve existing HTTP method/body/response or provide supported adapter tested before switching web clients. Writes CSRF + audit + request ID and idempotency where payment/year transition is involved.

**Concrete API behavior:** Extend Students read controller directory/profile query DTO to accept optional session ID, default DB ACTIVE session (not calendar year); verify it belongs to actor.schoolId; fallback for legacy enrollment records.

## 4. Service/repository algorithm — implement in this order
1. Extend Students read controller directory/profile query DTO to accept optional session ID, default DB ACTIVE session (not calendar year); verify it belongs to actor.schoolId; fallback for legacy enrollment records.
2. Update student API client to include year filter and invalidate SWR/cache-like state when school or year switches. Closed year shows immutable history and disabled write controls, not stale current enrollment.
3. Back/forward/reload/deep-link retain selected year and typed errors for non-owned/inactive year; no blank card due to transient selector fetch.
4. Prove old /operator/students route still works with no year param; year-specific class counts and profile match enrollment history.

**Inter-module integration currently proposed:** Next.js shared YearSelector in operator Students header, query-string or app context derived from verified sessions list. All student API clients pass chosen year; screens display ACTIVE / CLOSED and enforce view-only context; state remains correct on browser refresh/back.

**Failure handling:** Selecting previous year must not silently move a pupil's actual enrollment or change fee config. Screens without year support do not inherit invalid global state. Do not show an unsafe 'All Years edit'. Every mutation that spans modules is done through owned facade commands and a durable outbox/coordinator, not direct sibling-model SQL.

## 5. UI / navigation DLD
- Use existing operator/admin Next.js route, API client and design tokens. Do not hide old actions, invent an unavailable destination or make report navigation grant a forbidden action.
- State model: initial/skeleton → ready/empty → editing → validating → submitting → success or 409 stale/422 invalid or 503 retry. Retain user's input after recoverable failure; prevent double-submit.
- Form fields, labels, date formats, source-of-truth totals and role-based controls follow the task's contract above. Provide clear messaging for missing legacy mapping and prior paid records; no raw database enum/UUID where a human-readable label exists.
- Verify desktop (1366px), tablet (768px), mobile (360px), print when relevant, keyboard, labels/focus and long schools/student names. A redesign may change layout but must preserve old workflow end-to-end.
- **Exact UI and school examples:** Prove old /operator/students route still works with no year param; year-specific class counts and profile match enrollment history.

## 6. Executable FE / BE / NFR tests
**FE interactive cases:** TASK-010-FE01 user journey on 360/768/1366; TASK-010-FE02 invalid form; TASK-010-FE03 old user journey.
  
**BE unit, integration, DB and security cases:** TASK-010-BE01 service API; TASK-010-BE02 tenant isolation; TASK-010-BE03 transaction race.

**NFR, reliability, performance and privacy cases:** TASK-010-NFR01 load target; TASK-010-NFR02 privacy; TASK-010-NFR03 DB migration/rollback.

**Additional negative cases that must pass:** API called without CSRF; school B UUID from school A; wrong role with valid auth; duplicate retry; stale version; old record/empty nullable field; process crash during async step if used. Unit mocks are insufficient—test with real isolated PostgreSQL/Redis/file service where changed.

**Existing behavior regression mandatory:** BASE-05,06,07,08. Rerun relevant [BASE-XX workflows](../REGRESSION-BASELINE.md) before and after. No task is successful if the new behavior works but old user functionality breaks.

## 7. Completion evidence and rollout
Produce PR diff (source files/DTO/API), migration SQL, before/after screenshots and API snapshots, actual FE/BE/NFR logs, cross-tenant/money invariants, p50/p95 (where changed), previous document checksum if applicable, backup/recovery result and reviewer comment. **Only after approved integration** change the single tracker status to DONE. The task document itself has no mutable status.
