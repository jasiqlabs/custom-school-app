# Current Implementation Audit — Evidence from `main`

**Read-only audit:** 2026-10-16, commit `3d5a609f50be88af8366338bc7466316b435bbc1`. This is a **code review**, not a runtime or production test.

## Source locations and confirmed observations

| Area | File(s) | Finding / impact |
|---|---|---|
| Branch source | GitHub refs | `main` exists; `master` does not. Default points at an old feature branch, so never rely on default reads. |
| Data model | `prisma/schema.prisma` | `Class`, `Section`, `StudentEnrollment` exist but no `AcademicSession`/academic-year FK. `EnrollmentStatus` is ACTIVE/ENDED only. |
| Classes | `apps/api/src/modules/platform-admin/academics/academics.service.ts` | Class/section CRUD is school-scoped but has no year selector/rollover. |
| Student admission | `apps/api/src/modules/students/application/admit-student.service.ts`; `apps/web/src/app/operator/students/new/ui.tsx` | Has mandatory Aadhaar validation, student `udiseCode`, class/section selection, concession type/value. |
| Aadhaar validation | `packages/validation/src/students/student.schema.ts`; `apps/api/src/modules/students/domain/student.validator.ts` | Mandatory 12-digit Aadhaar in admission; Verhoeff validation; masking relies on last four characters. |
| Aadhaar bulk import | `apps/api/src/modules/students/application/student-import.service.ts` | XLSX header marks Aadhaar required; rows without Aadhaar rejected; import encrypts sensitive profile. |
| Aadhaar storage | `prisma/schema.prisma` | `StudentPrivateProfile.aadhaarLast4` is required string; nullable change plus read-safe masking is essential. |
| School identity | `prisma/schema.prisma`; `apps/api/src/modules/platform-admin/schools/schools.service.ts` | Name/address/phone/email/logo/principal exist; no school UDISE/school code/affiliation number. |
| Public home | `apps/web/src/app/page.tsx` | Two entry panels: Platform Admin and School Operator; requested single CTA is not present. |
| Transfer Certificate | `apps/api/src/modules/platform-admin/tc/tc.controller.ts`, `tc.service.ts`, `apps/worker/src/tc-pdf-builder.ts` | Platform-admin-only TC controller, frozen encrypted snapshot and job/PDF flow exist; no dues clearance gate, no school codes on PDF. |
| Admission form | `apps/api/src/modules/students/application/search-students.service.ts`; `apps/web/src/app/operator/students/[id]/admission-form/ui.tsx` | Operator print exists; school codes absent. |
| Operator permissions | `prisma/schema.prisma`; `apps/api/src/common/security/session.guard.ts`; `apps/api/src/modules/platform-admin/operators/operators.service.ts` | No operator permission or role field. Current `OperatorGuard` checks OPERATOR session, not view/edit capability. |
| Fee schema | `prisma/schema.prisma` | `ClassFeeConfig` stores a monthly amount; `FeeDue` unique by `schoolId,studentId,feeMonth`; `FeePayment` has exactly one `dueId`. Not suitable for multiple independent fees per month without additive redesign. |
| Fee generation | `apps/api/src/modules/fees/application/generate-dues.service.ts` | `ensureDuesForApplicableMonths` generates current and possibly admission month, not every intervening month; historical gaps are possible. |
| Pending fees | `apps/api/src/modules/fees/application/query-pending-fees.service.ts` | Monthly reporting filters one `feeMonth`; not comprehensive all-previous-month dues/arrears. |
| Fee collection | `apps/api/src/modules/fees/application/collect-payment.service.ts`; `apps/web/src/app/operator/fees/collect/ui.tsx` | Partial payments + idempotency + row locks exist; one due per payment; selected due cards show month-wise balances but no combined arrears billing. |
| Concessions | `Student.concessionType/concessionValue` & Zod input; `concession-calculator.ts` | Value/type supported; descriptive reason not stored. |
| Receipts | `apps/web/src/app/operator/fees/collect/ui.tsx` and `fees/history/ui.tsx` | Printable in-browser receipts and history modal exist; no dedicated PDF download; operator identity and requested two-copy format not implemented as specified. |
| Fees reports | `apps/api/src/modules/fees/application/fee-exports.service.ts` | Pending-fees XLSX export exists but no read-only operator capability boundary. |

## Why the tasks cannot all be independent UI fixes

1. **Academic years** change enrollment scoping and history; update consumers through a migration-safe compatibility layer.
2. **Multiple fee types** require charge identity distinct from `feeMonth`, and one receipt may pay multiple charge lines; current `FeePayment.dueId` and monthly uniqueness are limiting.
3. **Fee clearance** must use an authoritative all-outstanding balance, not a client-calculated value, and must reject stale/racing approvals.
4. **Read-only operators** require backend authorization on every read/export/download/mutation path, not hidden buttons.
5. **Optional Aadhaar** touches both manual and bulk admissions, crypto payload, last-four storage, output masking and printable views.
6. **Documents** should use frozen school/student/fee data at issue time so older outputs do not silently change when profiles or amounts change.

## Review limits

- No local database was migrated; no tests were executed; no assertions about live production data.
- Findings are based on the exact listed `main` revision, not another branch or deployed environment.
- Requirements that do not specify business rules are explicitly listed in `07-open-decisions.md`, not guessed.
