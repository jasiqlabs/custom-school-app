# Client Feedback: Welcome, Identity, Admissions, Receipts & Operators

**Evidence:** `update 2.docx`, pages 1–5. All changes must preserve secure platform-admin access, operator login, existing uploads and financial records.

## FB-01 — Welcome window; one public entry (P1; source page 1)

**Requirement.** Replace the current public dual-panel landing with a welcoming, responsive entry. Rename 'School Operator Panel' to **Manage Your School**; make this the only visible call-to-action; hide 'Platform Admin Panel' from public landing.

**DLD.** Modify `apps/web/src/app/page.tsx` and `home.module.css` only for presentation; preserve `/admin/login`, its auth guard, internal admin deep links and endpoints. Do not implement security via hiding a link. Accessible single primary CTA to `/operator/login`; existing branding assets and mobile/tablet responsiveness retained.
**FE tests.** Exactly one portal CTA, correct destination, logged-in/out navigation, keyboard/reader, mobile/tablet/desktop, text wrap.
**BE tests.** Admin login still returns expected auth result; unauthorized admin route still rejected; operator login unchanged.
**NFR tests.** Lighthouse/accessibility, no layout shift, no image regression; no publicly linked admin CTA in DOM.

## FB-02 — Three school identifiers (P1; source page 1)

**Requirement.** School UDISE, School Code and Affiliation Number are **school-level** attributes, editable via authorized school setup and visible on school detail.

**DLD.** Add nullable `udiseNumber`, `schoolCode`, `affiliationNumber` to `School` (exact names resolved with existing conventions). API school create/update/read contract and Zod input; admin school profile and onboarding UI with clear labels. Treat codes as **strings** to preserve leading zeroes; trim/length limits; avoid enforcing uniqueness until confirmed; do not repurpose `School.id` UUID. Require `School.version` optimistic locking; audit changed field names, not private values.
**FE tests.** Create/edit blank & full, leading zeros, long strings, reopening, validation errors; existing schools with no codes show `Not provided`.
**BE tests.** Tenant/id authorization, optimistic version conflict, safe migration on populated school records, output include fields on read only.
**NFR tests.** Additive SQL migration and rollback, school-detail response budget, sanitized logs, no admin accessibility regression.

## FB-03 — Remove student-UDISE input; print school identifiers (P1; page 1)

**Requirement.** Remove the mislabeled **student UDISE Code** from academic enrollment. Print School UDISE, School Code, Affiliation Number on **TC and Admission Form**. Do not erase existing student records.

**DLD.** Hide `Student.udiseCode` in new-admission/edit form and user-facing admission DTO, retaining legacy column/data temporarily for compatibility; mark deprecated, not deleted. Add school identity fields to admission-form DTO in `search-students.service.ts`, its printable UI and TC frozen snapshot in `tc.service.ts`, then `tc-pdf-builder.ts`; bump TC template version rather than changing past immutable files. Handle blank school values gracefully; decide mandatory-for-issuance policy separately.
**FE tests.** Enrollment has no student-level UDISE input; print preview & A4 pagination show codes and long school name correctly; legacy student view remains safe.
**BE tests.** TC snapshot and admission data carry correct school codes from actor's tenant; historical TC unchanged; no unrelated schema contract break.
**NFR tests.** Print rendering at A4, concurrent TC jobs, glyph coverage, encrypted snapshot integrity, data-minimization.

## FB-04 — Aadhaar must be optional (P0; page 2)

**Requirement.** Admit and update students **without Aadhaar**; when provided, preserve present strict validation/encryption/masking. Apply to manual admission and bulk XLSX import.

**DLD.**
- Change `studentAdmissionSchema` from required `aadhaarNumber` to optional/nullable/empty-normalized; update profile schema carefully. Do not accept malformed non-empty numbers.
- Update `AdmitStudentUi` to remove required marker and `^\d{12}$` blocking condition unless nonempty.
- Modify `StudentDomainValidator.validateAadhaar` call sites to skip when blank; represent missing Aadhaar in encrypted profile as `null` or omit according to crypto schema, never fake zeroes.
- Change `StudentPrivateProfile.aadhaarLast4` to nullable with migration; show `Not provided` instead of `XXXX-XXXX-`; avoid showing empty placeholders.
- Update `student-import.service.ts`: change template header, row validator, row snapshot, import persist and error workbook. Preserve compatibility with existing old template files; test mixed imported rows.
- Review profile, editing, printing, TC snapshot and Student search code paths for non-null assumptions.

**FE tests.** Blank Aadhaar successful; valid Aadhaar successful; invalid nonblank rejected; edit add/remove Aadhaar; import with missing/valid/invalid mix, reupload older template.
**BE tests.** Encrypted missing value handling, masking of old populated records, uniqueness/isolation unchanged, legacy data migration, Verhoeff checks preserved, no Aadhaar in API list/log/export.
**NFR tests.** PII leakage audit, encryption key compatibility and test vectors, bulk 5k rows memory, no broken profile read.

## FB-05 — Fee receipt redesign and two copies (P1; page 3)

**Requirement.** Follow attached example: an **Office Copy** and **Student Copy**; school identity; receipt no/date; student and class; fee line-item table (amount/discount/fine/paid); billed, discounted, received and remaining summary; total amount in words; authorized operator's **full name**; amount using **₹** if confirmed in client review.

**DLD.**
- Keep historical receipt number, payment ID and immutable received amount; introduce `ReceiptViewModel` built server-side from payment allocation snapshots, school branding and `FeePayment.createdBy -> SchoolOperator.fullName`. Snapshot collected-by name at issue time if operator can later be renamed/deleted; handle legacy record via safe fallback.
- Shared print layout for collect and history, not two divergent components; ensure voided receipts are unmistakably VOIDED and preserve original amounts.
- `₹` must be actual glyph with reliable embedded/available print font; note source extraction contains `?`, confirm.
- Two distinguishable sections or selectable combined print layout; page-break controlled; no fake authorized signature.
**FE tests.** Two copy headers, correct columns and totals, amount-in-words for cents/large amounts, printed operator name, void watermark, A4/print to PDF, narrow-screen preview.
**BE tests.** All totals equal ledger allocations, createdBy actor cannot be spoofed, old/deleted operator fallback, tenant-safe and stable historical receipt lookup.
**NFR tests.** Layout snapshot golden PDFs for 1, 8, 25 line items; Unicode ₹, repeated print performance, accessible text extraction, no receipt data cross-tenant.

## FB-06 — Download in Payment History (P1; page 4)

**Requirement.** Every authorized payment history row offers **Download Receipt** in addition to existing View/Print, including status-aware void records. Do not mistake browser Print button for a downloadable document.

**DLD.** Add protected `GET /operator/fees/payments/:id/receipt.pdf` returning versioned PDF or a tenant-scoped short-lived signed URL backed by file service. Reuse the same receipt view-model as FB-05. Add download button in `history/ui.tsx` with progress/disabled/error feedback and safe filename; avoid storing raw PII in public URLs. Refund/void must not rewrite old financial facts.
**FE tests.** PDF saved and re-openable; mobile browser; unknown/unavailable payment; voided record; duplicate clicks; keyboard.
**BE tests.** Response status/content type/cache no-store, school isolation, wrong role/permission 403, no direct unprotected public file path, consistent amounts.
**NFR tests.** Concurrent download bursts; bandwidth/rate limits; PDF accessibility, render budget, upload/storage failure handling.

## FB-07 — Read-only report/download operator (P0; page 5)

**Requirement.** Operator Type 1 can **only view available reports and download them**. It must not create/edit students, collect/void fees, configure charges, issue documents, manage transport, upload data, promote students, or access platform-admin settings.

**DLD.** Define role `REPORT_VIEWER` with allow-listed capabilities (e.g. `reports:read`, `reports:download`), NOT blanket all GET endpoints. Create dedicated reports menu routes; hide mutation controls and unrelated modules. Server guards must authorize each report list/detail/export/download; never rely on disabled buttons. Decide whether personally identifiable fields are allowed on reports; minimize by default. Deny generic Student GET/profile unless explicitly approved.
**FE tests.** Correct report-only nav, working download, no edit CTAs, address-bar deep-link to edit redirects/denies, consistent responsive UI.
**BE tests.** Table-driven all API endpoints deny type 1 writes, including CSRF-valid direct calls and imports; reports allow only own school; no PII endpoints exposed accidentally.
**NFR tests.** Role escalation/security fuzzing, no cross-tenant report caches, 403 response consistency, audit of forbidden attempts.

## FB-08 — Full operator model and enforcement (P0; page 5)

**Requirement.** Operator Type 2 can view/edit/manage **school operator functionality** as today. Platform Admin stays a separate elevated user type and is **not** included in operator type 2 access.

**DLD.**
- Add role `MANAGER` (or `FULL_OPERATOR`) and `REPORT_VIEWER` to SchoolOperator; existing operators migrate to MANAGER to preserve access. Make new role explicit in admin Create/Edit Operator UI and responses.
- Include permission/role or `accountVersion`-based revocation in `SessionService.resolve`, or fetch fresh DB role on each protected request; role change must revoke/invalidate existing sessions.
- Extend guards with explicit capability decorator/guard. Audit *every* operator route: fees, student CRUD/read, import/download, transport, dashboards, year controls, TC, certificates, report exports and file links. Ensure one permission source for both menu and APIs.
- Keep admin-specific operator create/delete/reset controls behind PlatformAdminGuard, independent of school role.
**FE tests.** Admin assigns roles, edits existing operator role, operator sees correct menu after relogin, expired old privilege not displayed, errors gracefully.
**BE tests.** MANAGER existing endpoint regression; REPORT_VIEWER allow-list; session token after role downgrade; cross-school attempt; duplicate operator email & last-operator policy unchanged.
**NFR tests.** Authorization middleware overhead, high-volume exports, deny-by-default when new route missing capability, structured security audit without secrets.

---

## Special safety warning

A previous client statement that read-only operators can 'view all reports' **does not imply** free access to student private profiles, Aadhaar, live payment mutations, platform-wide dashboards or another school's exports. This boundary must be signed off before junior developers implement role navigation.
