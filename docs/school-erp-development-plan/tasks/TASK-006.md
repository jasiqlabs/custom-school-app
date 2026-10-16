# TASK-006 — Public landing entry and operator navigation

**Deliverable ownership:** Web. **Explicit completed predecessors:** none. **Single status/evidence authority:** [Task Tracker](../TASK-TRACKER.md). **Design maturity:** Proposed task DLD pending canonical Harness change approval. **No dependency on any higher numbered task.**

## 1. Complete deployable outcome for this task

One visible public CTA 'Manage Your School' routes to existing operator login while admin route continues accessible by direct secure URL.

**Not part of this task:** Do not disable platform-admin authentication or touch other protected navigation.

## 2. Functional requirement, users and acceptance journeys

**User story:** As a school visitor I see one friendly welcome action, 'Manage Your School', instead of choosing between Operator and Platform Admin panels.

**School use cases / required results:** UC1: anonymous public home shows one green/primary link to operator login. UC2: platform administrator visits /admin/login through authorized direct URL and logs in successfully. UC3: keyboard-only user finds and activates CTA. UC4: deep-linked old panel URL remains reachable if authorized.

**Rules, permissions and policy boundaries:** Hide Platform Admin CTA only on public homepage; do NOT delete or disable admin login/API. Keep GET DIGITAL YOUR SCHOOL brand. Responsive web first; no new login permissions implied.

## 3. Detailed technical design (DB, API, service and UI)

**Persistent schema, migration and indexing:** No schema change. Frontend only replaces two portal-card layout with clear single-CTA welcome/hero; preserve alt text, link destination and accessibility semantics.

**API contract, validation and status/errors:** No new API. Existing /operator/login and /admin/login route guards must be unchanged; do not redirect /admin to /operator.

**Backend/service algorithm, module/public facades and FE binding:** Next.js apps/web/src/app/page.tsx new hero + exactly one primary <Link href='/operator/login'>Manage Your School</Link>. CSS uses fluid spacing and max content width; account for portrait mobile widths and reduced-motion accessibility. Optional direct portal link hidden in public DOM; no link to /admin on landing.

**Failures, concurrency, idempotency and edge cases:** Admin route should stay secure independently of discoverability; static site may expose JS routes but authorization must be server-enforced. No visual reliance on emojis/icons. Preserve current branding assets.

## 4. Task-specific FE / BE / NFR verification plan

**Frontend FE cases:** TASK-006-FE01 public homepage shows exactly one 'Manage Your School' CTA; FE02 correct /operator/login destination; FE03 no public admin card/CTA in DOM, /admin/login deep link remains; FE04 keyboard, screenreader and 360/768/1366 responsiveness; FE05 brand assets/layout work.

**Backend BE cases:** TASK-006-BE01 admin existing route still authenticates platform user, operator route still authenticates operator; BE02 unauthenticated admin endpoint denies; BE03 no bypass by URL tampering.

**Nonfunctional NFR cases:** TASK-006-NFR01 Lighthouse/contrast/keyboard; NFR02 image sizes/layout shift; NFR03 no performance regression; NFR04 no weakening auth.

## 5. Compatibility and completion gate

**Data invariants:** Never change an already issued receipt/TC or fabricate old dates/fees; schoolId and actor come only from verified session; no sibling-domain Prisma reach-through. Preserve operator login, student admission/import, old month fee collection/void, transport, platform TC and reports (where relevant).

**Deployability:** This task must be complete and independently testable using **only its listed lower-numbered prerequisites**. If a later capability needs an extension point, provide a backward-compatible port without invoking unimplemented functionality, with any UI action feature-gated until it actually works. On every task run local type/build, focused FE/BE/NFR and security tests; include deployment rollback/reconciliation before enabling migrations. Approved product rules and canonical Harness DLD take priority over unapproved alternatives.

**Definition of done:** Functional acceptance cases and FE/BE/NFR tests pass with measured evidence, reviewer signoff and no stable-flow regression. Record actual assignee, PR/commit and results in [TASK-TRACKER.md](../TASK-TRACKER.md), not in this document.
