-- AlterTable
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "books_required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "uniform_required" BOOLEAN NOT NULL DEFAULT false;

