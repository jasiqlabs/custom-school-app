# TASK-006 — Public landing entry and operator navigation

**Deliverable:** Web | **Requires:** none | **Decision gate:** SPEC_SYNC_REQUIRED | **Risk reviewer:** **LOW** | **Execution status:** [single tracker](../TASK-TRACKER.md).

> This is an **implementation specification**, not a record of work completed or an already approved canonical Harness DLD. Do not change an existing route/record without verifying it against `main` and obtaining any needed Harness revision approval.

## 1. Business acceptance

**Story:** As a school visitor I see one friendly welcome action, 'Manage Your School', instead of choosing between Operator and Platform Admin panels.

**User journeys from requirements:** UC1: anonymous public home shows one green/primary link to operator login. UC2: platform administrator visits /admin/login through authorized direct URL and logs in successfully. UC3: keyboard-only user finds and activates CTA. UC4: deep-linked old panel URL remains reachable if authorized.

**Invariant and policy:** Hide Platform Admin CTA only on public homepage; do NOT delete or disable admin login/API. Keep GET DIGITAL YOUR SCHOOL brand. Responsive web first; no new login permissions implied.

**Task boundary:** This is public-navigation copy/layout only; backend auth behavior intentionally stays unchanged. No later TASK service is required for this task to build, operate or be tested.

### Acceptance example / golden scenario
Anonymous home has one CTA and no public admin entry; direct admin login still authenticates admin, operator login authenticates operator; wrong session rejected.

## 2. DLD — Existing system & ownership

**Actual main files to inspect first:** `apps/web/src/app/page.tsx`<br>`apps/web/src/app/operator/login/ui.tsx`<br>`apps/web/src/app/admin/login/page.tsx`

**Domain responsibility:** Web owns the new state or coordinates via an approved public facade. All operator school IDs come from the verified server actor, Platform Admin uses its own authenticated school selector; no sibling Prisma reach-through. Shared payload validation belongs to Zod/contracts, not duplicated backend/frontend regex.

**Known current design / proposed persistence:** No schema change. Frontend only replaces two portal-card layout with clear single-CTA welcome/hero; preserve alt text, link destination and accessibility semantics.

### Migration sequence (required, not optional)
1. On a disposable database seeded with **two different schools** and legacy paid/partial/void/TC records, apply an **additive** Prisma migration (nullable fields and independent tables first).
2. Verify old code paths continue to read and write without new non-null field requirements. Preserve UUID, receipt number, prior-year identity and file checksum.
3. Where historical backfill is required, use a deterministic per-school dry-run with reviewed match evidence, idempotent UPSERT/conflict semantics and explicit `UNKNOWN/UNVERIFIED` handling rather than guessing historic school data.
4. Add adapters/feature-gated cutover, compare before/after affected counts and values. Never drop an old table/field in the same feature; a rollback of *financial* production writes usually means safe roll-forward, not deleting new charges.
5. Record migration SQL, `prisma migrate status`, affected row counts and rollback/restore rehearsal for reviewer.

## 3. DLD — HTTP, authorization & public contracts

**Proposed endpoints/DTOs:** No new API. Existing /operator/login and /admin/login route guards must be unchanged; do not redirect /admin to /operator.

**Input/output constraints:** validate school-owned UUIDs, appropriate business-date strings `YYYY-MM-DD`, concurrency/version tokens on updates, idempotency keys on retries and PII-safe read projections. Preserve all old paths/methods or implement and test a compatibility adapter; avoid forcing API changes to other working pages.

**Expected typed errors:** 401 missing/expired session, 403 unauthorized role/capability, 404 foreign-school object (avoid ID existence leak), 409 stale version/duplicate/invalid business transition, 422 invalid inputs, 503 transient file/queue/unavailable dependency. Every write remains CSRF protected and auditable.

## 4. DLD — Exact implementation sequence

1. Keep /operator/login and /admin/login unchanged; modify only public apps/web/src/app/page.tsx and shared landing styles.
2. Render one accessible primary link 'Manage Your School' targeting existing operator login, not a new authentication mechanism.
3. Hide public Platform Admin CTA, but do NOT delete platform-admin route or change its server guard.
4. Verify logo, responsive hero and keyboard navigation at 360/768/1366 px; no broken old login deep links.

**Existing workflow integration:** Next.js apps/web/src/app/page.tsx new hero + exactly one primary <Link href='/operator/login'>Manage Your School</Link>. CSS uses fluid spacing and max content width; account for portrait mobile widths and reduced-motion accessibility. Optional direct portal link hidden in public DOM; no link to /admin on landing.

**Recovery and concurrency:** Admin route should stay secure independently of discoverability; static site may expose JS routes but authorization must be server-enforced. No visual reliance on emojis/icons. Preserve current branding assets.

**Specific safety watch:** Keep previous route payloads, the old student/month money model and completed document snapshots compatible while delivering the new capability.

## 5. DLD — Frontend screen and UI state contract

- **Entry/navigation:** use the existing admin or operator screen under `apps/web/src/app`; do not replace unrelated navigation or build a dead button for a later task.
- **Render:** show correct label, values and school context from server, accessible input labels, 360/768/1366 layouts, loading/empty/error/ready/success states, and a short human-readable reason for 409/422.
- **Write UX:** validate before submit, prevent accidental double-submit and stale overwrite, retain form data on recoverable error, refresh server state on successful save and provide clear next action.
- **Preserve existing FE:** rerun impacted routes before/after any redesign; a different layout is permitted but previously working actions, link targets, permissions and print behavior must still work.
- **Source-backed UI checks:** TASK-006-FE01 Homepage has one visible Manage Your School CTA; FE02 click leads to /operator/login and operator can log in; FE03 /admin/login direct URL still works for Platform Admin but no admin CTA appears publicly; FE04 360/768/1366 fluid layout and keyboard/screenreader focus; FE05 branding/logo, guest logout and back navigation unchanged.

## 6. Test cases — FE, BE, NFR (record evidence; not just checkboxes)

**Frontend acceptance tests:** TASK-006-FE01 Homepage has one visible Manage Your School CTA; FE02 click leads to /operator/login and operator can log in; FE03 /admin/login direct URL still works for Platform Admin but no admin CTA appears publicly; FE04 360/768/1366 fluid layout and keyboard/screenreader focus; FE05 branding/logo, guest logout and back navigation unchanged.

**Backend unit/API/database tests:** TASK-006-BE01 admin existing route still authenticates platform user, operator route still authenticates operator; BE02 unauthenticated admin endpoint denies; BE03 no bypass by URL tampering.

**NFR, security, load and recovery tests:** TASK-006-NFR01 Lighthouse/contrast/keyboard; NFR02 image sizes/layout shift; NFR03 no performance regression; NFR04 no weakening auth.

**Test environment:** synthetic School A and B; fresh and existing records; valid/invalid IDs; MANAGER, Platform Admin and REPORT_VIEWER when implemented. Capture exact request/response/error snapshots, UI screenshots and timings *before and after*. All status is tracked in the single tracker, not here.

**Mandatory old-function regression:** BASE-01,16. Re-run old login/session rules, class/student admission/search/import, monthly fee generation/pay/void/receipt, transports, dashboard/report exports, platform TC and private files **where touched**. See [REGRESSION-BASELINE](../REGRESSION-BASELINE.md).

## 7. Deployment & Definition of Done

- Task builds/deploys with **only listed completed predecessors**, no assumptions on later task IDs.
- Changed schema and API are compatible with old data/clients, with durable audit/CSRF/tenant isolation.
- New FE/BE/NFR cases and impacted BASE tests executed and actual logs/screens/metrics linked; old journeys not broken.
- Reviewer approves any intentional behavioral replacement and risky migration (senior review on auth, PII, fees, academic migration, documents).
- `git diff --check`, targeted/full tests, browser walkthrough, API integration, environment baseline and rollback plan are recorded.
- **Only then** reviewer updates [TASK-TRACKER.md](../TASK-TRACKER.md) to DONE after approved integration. Do not mark an intern's self-test as independent signoff.
