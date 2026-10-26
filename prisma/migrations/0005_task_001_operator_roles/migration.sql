CREATE TYPE "OperatorRole" AS ENUM ('MANAGER', 'REPORT_VIEWER');

ALTER TABLE "school_operators" ADD COLUMN "role" "OperatorRole" NOT NULL DEFAULT 'MANAGER';
