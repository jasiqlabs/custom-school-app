# TASK-001 — Operator roles and server-side capability enforcement

**Deliverable:** Access control | **Requires:** none | **Decision gate:** SPEC_SYNC_REQUIRED | **Risk reviewer:** **HIGH** | **Execution status:** [single tracker](../TASK-TRACKER.md).

> This is an **implementation specification**, not a record of work completed or an already approved canonical Harness DLD. Do not change an existing route/record without verifying it against `main` and obtaining any needed Harness revision approval.

## 1. Business acceptance

**Story:** Platform administrator provisions a Type 1 report viewer or Type 2 manager, and every server operation checks capabilities, even if browser UI is bypassed.

**User journeys from requirements:** UC1: existing operators retain full functionality after migration. UC2: new REPORT_VIEWER can view allowed reports. UC3: existing manager is downgraded while logged in; old token immediately loses write rights. UC4: report viewer attempts TC issue with endpoint direct URL; 403. UC5: manager cannot access /platform admin routes.

**Invariant and policy:** MANAGER=full school-operations capability, not cross-school administration. REPORT_VIEWER=approved reports only. Default DENY for any new endpoint without declared ability. Do not couple capability to school status; both school status and role must pass. Password reset/deactivation still revokes sessions.

**Task boundary:** Confirm exactly which report endpoints and PII columns viewer sees in TASK-002. TASK-001 must NOT expose a 'show all GET' shortcut. No later TASK service is required for this task to build, operate or be tested.

### Acceptance example / golden scenario
Two schools; existing manager may still admit/pay/import/assign/void; newly created viewer receives 403 for direct student POST, PATCH and fee POST despite valid CSRF; role downgrade revokes cookie and file access.

## 2. DLD — Existing system & ownership

**Actual main files to inspect first:** `apps/api/src/common/security/session.guard.ts`<br>`apps/api/src/platform/auth/session.service.ts`<br>`apps/api/src/modules/platform-admin/operators/operators.service.ts`<br>`prisma/schema.prisma`<br>`apps/web/src/app/admin/(protected)/schools/[schoolId]/operators/ui.tsx`

**Domain responsibility:** Access control owns the new state or coordinates via an approved public facade. All operator school IDs come from the verified server actor, Platform Admin uses its own authenticated school selector; no sibling Prisma reach-through. Shared payload validation belongs to Zod/contracts, not duplicated backend/frontend regex.

**Known current design / proposed persistence:** SchoolOperator.role enum REPORT_VIEWER|MANAGER default MANAGER for backfill only; capability registry codes in type-safe contract; session includes roleVersion or compare SchoolOperator.accountVersion on every privileged call. On role update bump accountVersion+revoke all user sessions transactionally; store audit old/new role.

### Migration sequence (required, not optional)
1. On a disposable database seeded with **two different schools** and legacy paid/partial/void/TC records, apply an **additive** Prisma migration (nullable fields and independent tables first).
2. Verify old code paths continue to read and write without new non-null field requirements. Preserve UUID, receipt number, prior-year identity and file checksum.
3. Where historical backfill is required, use a deterministic per-school dry-run with reviewed match evidence, idempotent UPSERT/conflict semantics and explicit `UNKNOWN/UNVERIFIED` handling rather than guessing historic school data.
4. Add adapters/feature-gated cutover, compare before/after affected counts and values. Never drop an old table/field in the same feature; a rollback of *financial* production writes usually means safe roll-forward, not deleting new charges.
5. Record migration SQL, `prisma migrate status`, affected row counts and rollback/restore rehearsal for reviewer.

## 3. DLD — HTTP, authorization & public contracts

**Proposed endpoints/DTOs:** Existing POST/PATCH /platform/schools/:id/operators accept role, role appears in GET list; PATCH role dedicated version guard; GET /operator/me/capabilities returns allow list and school identity. Capability guard uses @RequiresCapability('students.write' etc) and actor school, CSRF separately. 403 forbidden vs 404 foreign record. Never let manager choose own role.

**Input/output constraints:** validate school-owned UUIDs, appropriate business-date strings `YYYY-MM-DD`, concurrency/version tokens on updates, idempotency keys on retries and PII-safe read projections. Preserve all old paths/methods or implement and test a compatibility adapter; avoid forcing API changes to other working pages.

**Expected typed errors:** 401 missing/expired session, 403 unauthorized role/capability, 404 foreign-school object (avoid ID existence leak), 409 stale version/duplicate/invalid business transition, 422 invalid inputs, 503 transient file/queue/unavailable dependency. Every write remains CSRF protected and auditable.

## 4. DLD — Exact implementation sequence

1. Inventory **all** operator/controller endpoints and protected signed-file accesses; map MANAGER vs REPORT_VIEWER permissions in a reviewed capability table, with **DENY by default** for any new unmapped method.
2. Migrate SchoolOperator.role with existing accounts assigned MANAGER, then update platform operator create/edit Zod and forms. Role changes increment accountVersion and revoke outstanding user sessions transactionally.
3. Keep OperatorGuard authentication and CsrfGuard unchanged; add a separate server capability guard that executes before every controller handler and private-file grant. Manager must retain all prior actions.
4. GET/report endpoints with indirect writes (especially FeesPublicFacade.getStudentFeeSummary → ensureDuesForApplicableMonths) must remain MANAGER-only or be refactored to a truly read-only projection before viewer exposure.

**Existing workflow integration:** Admin operator add/edit form selection, explanatory labels and default appropriate role; server role update invalidates session. Extend OperatorGuard to resolve identity but leave capability authorization in dedicated guard covering every controller operation, including downloads/GET private profiles. Web header/nav built from validated me/capabilities; server pages auth-gated too.

**Recovery and concurrency:** Backfill on live tenants must retain existing operators, avoid null role fail-open, preserve admin/operator authentication plane split. Last active operator deletion policy unchanged. New routing approach must not bypass CSRF.

**Specific safety watch:** Do not replace existing SessionService subject/accountVersion model; extend it. If deny-by-default roll-out would lock existing manager out, ship a policy map with tests covering all existing routes in the SAME task.

## 5. DLD — Frontend screen and UI state contract

- **Entry/navigation:** use the existing admin or operator screen under `apps/web/src/app`; do not replace unrelated navigation or build a dead button for a later task.
- **Render:** show correct label, values and school context from server, accessible input labels, 360/768/1366 layouts, loading/empty/error/ready/success states, and a short human-readable reason for 409/422.
- **Write UX:** validate before submit, prevent accidental double-submit and stale overwrite, retain form data on recoverable error, refresh server state on successful save and provide clear next action.
- **Preserve existing FE:** rerun impacted routes before/after any redesign; a different layout is permitted but previously working actions, link targets, permissions and print behavior must still work.
- **Source-backed UI checks:** TASK-001-FE01 admin create/edit role; FE02 forced re-login after downgrade; FE03 old operator sees same navigation; FE04 report-viewer no fee collect; FE05 responsive/keyboard.

## 6. Test cases — FE, BE, NFR (record evidence; not just checkboxes)

**Frontend acceptance tests:** TASK-001-FE01 admin create/edit role; FE02 forced re-login after downgrade; FE03 old operator sees same navigation; FE04 report-viewer no fee collect; FE05 responsive/keyboard.

**Backend unit/API/database tests:** TASK-001-BE01 migration defaults existing to MANAGER; BE02 each controller route coverage test; BE03 stale cookie after downgrade denied; BE04 direct API invalid capability; BE05 cross-school and admin segregation; BE06 reset/deactivation unchanged.

**NFR, security, load and recovery tests:** TASK-001-NFR01 measurable guard overhead at 50 parallel requests; NFR02 deny-by-default regression scanner; NFR03 authorization audit with no PII; NFR04 zero session revocation race.

**Test environment:** synthetic School A and B; fresh and existing records; valid/invalid IDs; MANAGER, Platform Admin and REPORT_VIEWER when implemented. Capture exact request/response/error snapshots, UI screenshots and timings *before and after*. All status is tracked in the single tracker, not here.

**Mandatory old-function regression:** BASE-01,04,16. Re-run old login/session rules, class/student admission/search/import, monthly fee generation/pay/void/receipt, transports, dashboard/report exports, platform TC and private files **where touched**. See [REGRESSION-BASELINE](../REGRESSION-BASELINE.md).

## 7. Deployment & Definition of Done

- Task builds/deploys with **only listed completed predecessors**, no assumptions on later task IDs.
- Changed schema and API are compatible with old data/clients, with durable audit/CSRF/tenant isolation.
- New FE/BE/NFR cases and impacted BASE tests executed and actual logs/screens/metrics linked; old journeys not broken.
- Reviewer approves any intentional behavioral replacement and risky migration (senior review on auth, PII, fees, academic migration, documents).
- `git diff --check`, targeted/full tests, browser walkthrough, API integration, environment baseline and rollback plan are recorded.
- **Only then** reviewer updates [TASK-TRACKER.md](../TASK-TRACKER.md) to DONE after approved integration. Do not mark an intern's self-test as independent signoff.
