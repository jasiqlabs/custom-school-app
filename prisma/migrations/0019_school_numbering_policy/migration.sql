BEGIN;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS receipt_number_policy varchar(24) NOT NULL DEFAULT 'LEGACY';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS receipt_number_prefix varchar(16) NOT NULL DEFAULT 'REC';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS student_number_policy varchar(24) NOT NULL DEFAULT 'LEGACY';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS student_number_prefix varchar(16) NOT NULL DEFAULT 'STU';
CREATE TABLE IF NOT EXISTS school_number_series (
 school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
 kind varchar(16) NOT NULL,
 period_key varchar(80) NOT NULL,
 last_value integer NOT NULL DEFAULT 0,
 CONSTRAINT school_number_series_pkey PRIMARY KEY(school_id,kind,period_key)
);
COMMIT;
