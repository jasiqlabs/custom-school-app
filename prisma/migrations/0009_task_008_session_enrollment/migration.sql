-- AlterTable
ALTER TABLE "student_enrollments"
ADD COLUMN "academic_session_id" UUID,
ADD COLUMN "class_name_snapshot" VARCHAR(64),
ADD COLUMN "section_name_snapshot" VARCHAR(64),
ADD COLUMN "ended_reason" TEXT,
ADD COLUMN "enrollment_version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "student_enrollments_school_id_academic_session_id_status_idx" ON "student_enrollments"("school_id", "academic_session_id", "status");

-- Partial Unique Index on (school_id, student_id, academic_session_id) for ACTIVE enrollment
CREATE UNIQUE INDEX "student_enrollment_active_session_idx"
ON "student_enrollments"("school_id", "student_id", "academic_session_id")
WHERE "status" = 'ACTIVE' AND "academic_session_id" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_school_id_academic_session_id_fkey"
FOREIGN KEY ("school_id", "academic_session_id") REFERENCES "academic_sessions"("school_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
