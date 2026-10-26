-- AlterTable
ALTER TABLE "student_enrollments"
ADD COLUMN "valid_from" DATE,
ADD COLUMN "valid_until" DATE;

-- Populate existing rows: valid_from = (started_at AT TIME ZONE 'UTC')::DATE, valid_until = (ended_at AT TIME ZONE 'UTC')::DATE
UPDATE "student_enrollments"
SET "valid_from" = (started_at AT TIME ZONE 'UTC')::DATE
WHERE "valid_from" IS NULL;

UPDATE "student_enrollments"
SET "valid_until" = (ended_at AT TIME ZONE 'UTC')::DATE
WHERE "valid_until" IS NULL AND "ended_at" IS NOT NULL;

-- CreateIndex
CREATE INDEX "student_enrollments_school_id_student_id_valid_from_valid_until_idx"
ON "student_enrollments"("school_id", "student_id", "valid_from", "valid_until");

-- Check constraint for valid date ordering
ALTER TABLE "student_enrollments"
ADD CONSTRAINT "student_enrollments_valid_dates_check"
CHECK ("valid_until" IS NULL OR "valid_from" IS NULL OR "valid_until" >= "valid_from");
