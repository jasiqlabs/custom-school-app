CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "StudentGender" AS ENUM ('BOY', 'GIRL');
CREATE TYPE "ConcessionType" AS ENUM ('NONE', 'FIXED_AMOUNT', 'PERCENTAGE');
CREATE TYPE "TransportSetupState" AS ENUM ('NOT_REQUIRED', 'SETUP_PENDING', 'ACTIVE');
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'ENDED');
CREATE TYPE "ImportJobStatus" AS ENUM ('QUEUED', 'VALIDATING', 'READY', 'IMPORTING', 'COMPLETED', 'PARTIAL', 'FAILED');
CREATE TYPE "ImportRowStatus" AS ENUM ('PENDING', 'VALID', 'IMPORTED', 'ERROR');

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  student_code varchar(64) NOT NULL,
  normalized_code varchar(64) NOT NULL,
  full_name varchar(255) NOT NULL,
  normalized_name varchar(255) NOT NULL,
  father_name varchar(255) NOT NULL,
  mother_name varchar(255) NOT NULL,
  family_code varchar(64),
  tally_ledger_name varchar(255),
  dob date NOT NULL,
  gender "StudentGender" NOT NULL,
  admission_date date NOT NULL DEFAULT CURRENT_DATE,
  address text NOT NULL,
  phone varchar(32) NOT NULL,
  email varchar(255),
  emergency_contact varchar(32) NOT NULL,
  emergency_relation varchar(64) NOT NULL,
  pen_number varchar(64),
  udise_code varchar(64),
  previous_school varchar(255),
  previous_tc_number varchar(64),
  blood_group varchar(16),
  nationality varchar(64) NOT NULL DEFAULT 'Indian',
  hobbies text,
  achievements text,
  concession_type "ConcessionType" NOT NULL DEFAULT 'NONE',
  concession_value numeric(12,2) NOT NULL DEFAULT 0,
  transport_required boolean NOT NULL DEFAULT false,
  transport_setup_state "TransportSetupState" NOT NULL DEFAULT 'NOT_REQUIRED',
  photo_file_id uuid,
  status "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
  deactivation_reason text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_student_concession_value CHECK (concession_value >= 0),
  UNIQUE (school_id, normalized_code)
);

CREATE INDEX students_school_status_idx ON students(school_id, status);
CREATE INDEX students_school_normalized_name_idx ON students(school_id, normalized_name);
CREATE INDEX students_school_family_code_idx ON students(school_id, family_code);

CREATE TABLE student_private_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL,
  student_id uuid UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  encrypted_payload text NOT NULL,
  key_version varchar(32) NOT NULL DEFAULT 'v1',
  aadhaar_last4 varchar(4) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sections_school_id_id_key'
  ) THEN
    ALTER TABLE sections ADD CONSTRAINT sections_school_id_id_key UNIQUE (school_id, id);
  END IF;
END $$;

CREATE TABLE student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL,
  section_id uuid NOT NULL,
  status "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CONSTRAINT student_enrollments_class_fk FOREIGN KEY (school_id, class_id) REFERENCES classes(school_id, id) ON DELETE RESTRICT,
  CONSTRAINT student_enrollments_section_fk FOREIGN KEY (school_id, section_id) REFERENCES sections(school_id, id) ON DELETE RESTRICT
);

CREATE INDEX student_enrollments_student_idx ON student_enrollments(school_id, student_id, status);
CREATE INDEX student_enrollments_class_section_idx ON student_enrollments(school_id, class_id, section_id, status);

CREATE TABLE student_identifier_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  old_code varchar(64) NOT NULL,
  new_code varchar(64) NOT NULL,
  changed_by uuid NOT NULL,
  reason text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_identifier_history_idx ON student_identifier_history(school_id, student_id, changed_at);

CREATE TABLE student_id_sequences (
  school_id varchar(36) PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);

CREATE TABLE student_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  operator_id uuid NOT NULL,
  file_id uuid NOT NULL,
  error_file_id uuid,
  status "ImportJobStatus" NOT NULL DEFAULT 'QUEUED',
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_import_jobs_school_status_idx ON student_import_jobs(school_id, status, created_at);

CREATE TABLE student_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL,
  job_id uuid NOT NULL REFERENCES student_import_jobs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  status "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
  raw_encrypted text NOT NULL,
  preview_json jsonb NOT NULL,
  error_messages jsonb,
  imported_student_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, row_number)
);

CREATE INDEX student_import_rows_school_job_idx ON student_import_rows(school_id, job_id, status);
