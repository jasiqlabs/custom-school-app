# TASK-029 — School identifiers and historic context on transfer certificates

**Engineer/domain owner:** Documents / School. **Prerequisites (ALL already lower-numbered):** TASK-003, TASK-008, TASK-028 (all lower numbers). **Single status tracker:** [TASK-TRACKER.md](../TASK-TRACKER.md). **Design authority:** proposed until revised Harness approved DLD. **Not implementation evidence.**

## 1. Explicitly deliverable capability

**What this task delivers:** Add School UDISE, School Code, Affiliation Number and session-era class/section snapshots to **newly issued** TC PDFs, preserving old issued TCs byte-for-byte.

**Outside this task:** School identity configuration is provided by TASK-003. Student admission UDISE display is independent and does not block this TC enhancement; no operator TC issue route or fee clearance requirement in this print-template task.

**School user story:** As an official certificate issuer, I generate a new Transfer Certificate showing the correct school UDISE, School Code, Affiliation Number and the class/section for the student's relevant academic period.

**Real use cases and acceptance:** UC1: student 2025–26 year Class 1B, 2026–27 Class 2A; TC template chooses validated issue context and shows correct saved class not live 2027 class. UC2: school codes with leading zeroes appear on new TC. UC3: school lacking code gets readable omission/warning and no fabricated code. UC4: previously issued TC v1 PDF remains byte-identical. UC5: regenerate/reissue intentional creates new TC version not overwriting v1.

**Domain rules, authorization and scope:** New school codes from SchoolInfoPublicFacade, student historical enrollment from StudentsPublicFacade, year via AcademicsPublicFacade. Existing issued files frozen; signed private downloads unchanged. The fee clearance service is not required for this template change and is implemented in TASK-032 on existing issuer.

## 2. Detailed Level Design: data, HTTP contract, services and web UI

**Owned DB objects, constraints, schema migration and indexes:** Extend TC immutable encrypted snapshot.school {udiseNumber?,schoolCode?,affiliationNumber?}, snapshot.student {academicSessionId,classNameSnapshot,sectionNameSnapshot}; bump templateVersion to 'tc-v2' and pin rendering for historical v1. Preserve old TC row and file checksums. No Student.udiseCode to school migration.

**API/contracts, DTO validation, errors and role scope:** Existing /platform/schools/:schoolId/transfer-certificates POST may accept selected academicSessionId only where approved; old invocation defaults validated student current enrollment; GET/download remains byte-identical for v1. Issue snapshot DTO must include school codes; 409 unknown historic mapping, 404 wrong school.

**Backend transaction/workflow, module facades and frontend step-by-step state:** TcService builds frozen snapshot by invoking SchoolInfoPublicFacade and StudentsPublicFacade.resolveYearEnrollmentSnapshot; passes version to existing job worker renderer from TASK-028. New TC PDF displays school name/IDs in header and student class/section from saved period; PDF text extraction and goldens verify. Admission print already includes School IDs TASK-005.

**Concurrency/idempotency/recovery/correction edge cases:** If student inactive/left, validated historical class still available to administrator. If school code missing, policy determines print missing value vs readiness refusal (default graceful until approved). Old template v1 renderer kept for retries; do not alter old ciphertext.

## 3. Test plan — FE, BE and nonfunctional criteria

**FE cases:** FE01 TC preview shows 3 school codes; FE02 historic class label vs current; FE03 long school names and printed A4; FE04 old v1 download unchanged; FE05 null school identifiers and 360/768/1366 preview.

**BE cases:** BE01 typed school codes obtained via school owner, no direct sibling SQL; BE02 session-stamped historical enrollment; BE03 tenant-scope, old API compatibility; BE04 templateVersion v1/v2; BE05 worker retry same snapshot.

**NFR cases:** NFR01 immutable old hash; NFR02 PDF goldens glyphs and large title; NFR03 private storage permission; NFR04 encrypted snapshots decrypt old keys.

## 4. Independently complete implementation and review criteria

**Current task depends on NO future feature.** Use only the listed lower numbered prerequisites. When a later capability wants to reuse today's interface, provide a backwards compatible, tested port now with no disabled-but-visible nonfunctional buttons. Do not add direct another-module persistence access; school/role verified on server, private files signed only after domain check. Preserve existing platform-admin routes, operator auth, student directory/import, fee receipt/void, transport, dashboard and previously issued documents, with 7-year retention and non-destructive migrations.

**Exit gate:** All accepted use cases and named FE/BE/NFR tests executed, security/tenancy verified, migration rollback rehearsed, reviewer approved. Developer/reviewer must attach commands, measured baselines, screenshot/PDF snapshots, PR SHA and review outcome ONLY in [TASK-TRACKER.md](../TASK-TRACKER.md).
