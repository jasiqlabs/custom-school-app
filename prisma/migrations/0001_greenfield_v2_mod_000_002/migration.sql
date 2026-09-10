CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE "SchoolStatus" AS ENUM ('DRAFT','ACTIVE','INACTIVE');
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE "SessionUserType" AS ENUM ('PLATFORM_ADMIN','OPERATOR');
CREATE TYPE "FileType" AS ENUM ('LOGO','SIGNATURE','STUDENT_PHOTO','STUDENT_IMPORT','STUDENT_IMPORT_ERROR','TC','RECEIPT','REPORT_XLSX');
CREATE TYPE "FileStatus" AS ENUM ('AVAILABLE','CORRUPT');
CREATE TYPE "JobType" AS ENUM ('TC_PDF','REPORT_XLSX','STUDENT_IMPORT_VALIDATE','STUDENT_IMPORT_ERROR_EXPORT');
CREATE TYPE "JobStatus" AS ENUM ('QUEUED','PROCESSING','COMPLETED','FAILED');
CREATE TYPE "TcStatus" AS ENUM ('QUEUED','PROCESSING','COMPLETED','FAILED');
CREATE TYPE "ResetRequestStatus" AS ENUM ('REQUESTED','FULFILLED','DISMISSED');

CREATE TABLE platform_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(255) UNIQUE NOT NULL, full_name varchar(255) NOT NULL,
 password_hash varchar(255) NOT NULL, status "AccountStatus" NOT NULL DEFAULT 'ACTIVE', failed_count integer NOT NULL DEFAULT 0,
 locked_until timestamptz, account_version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE schools (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(255) NOT NULL, normalized_name varchar(255) NOT NULL, address text,
 phone varchar(32), email varchar(255), status "SchoolStatus" NOT NULL DEFAULT 'DRAFT', logo_file_id uuid,
 access_version integer NOT NULL DEFAULT 1, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX schools_normalized_name_idx ON schools(normalized_name); CREATE INDEX schools_status_idx ON schools(status);
CREATE TABLE school_principals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid UNIQUE NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
 name varchar(255) NOT NULL, phone varchar(32), email varchar(255), signature_file_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE school_operators (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
 email varchar(255) UNIQUE NOT NULL, full_name varchar(255) NOT NULL, password_hash varchar(255) NOT NULL,
 status "AccountStatus" NOT NULL DEFAULT 'ACTIVE', failed_count integer NOT NULL DEFAULT 0, locked_until timestamptz,
 account_version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX school_operators_school_status_idx ON school_operators(school_id,status);
CREATE TABLE classes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
 name varchar(64) NOT NULL, normalized_name varchar(64) NOT NULL, sort_order integer NOT NULL DEFAULT 0,
 status "EntityStatus" NOT NULL DEFAULT 'ACTIVE', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(school_id, normalized_name), UNIQUE(school_id,id)
);
CREATE INDEX classes_school_status_sort_idx ON classes(school_id,status,sort_order);
CREATE TABLE sections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
 class_id uuid NOT NULL, name varchar(64) NOT NULL, normalized_name varchar(64) NOT NULL, sort_order integer NOT NULL DEFAULT 0,
 status "EntityStatus" NOT NULL DEFAULT 'ACTIVE', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT sections_class_same_school_fk FOREIGN KEY (school_id,class_id) REFERENCES classes(school_id,id) ON DELETE RESTRICT,
 UNIQUE(school_id,class_id,normalized_name)
);
CREATE INDEX sections_school_class_status_sort_idx ON sections(school_id,class_id,status,sort_order);
CREATE TABLE user_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_type "SessionUserType" NOT NULL, user_id uuid NOT NULL, school_id uuid,
 token_hash varchar(128) UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, revoked_at timestamptz, revocation_reason varchar(64), account_version integer NOT NULL, school_access_version integer
);
CREATE INDEX user_sessions_user_idx ON user_sessions(user_type,user_id,revoked_at); CREATE INDEX user_sessions_school_idx ON user_sessions(school_id,revoked_at); CREATE INDEX user_sessions_expiry_idx ON user_sessions(expires_at);
CREATE TABLE login_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_type "SessionUserType" NOT NULL, identifier_hash varchar(128) NOT NULL,
 ip_hash varchar(128) NOT NULL, success boolean NOT NULL, reason varchar(64), attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_identifier_idx ON login_attempts(user_type,identifier_hash,attempted_at); CREATE INDEX login_attempts_ip_idx ON login_attempts(ip_hash,attempted_at);
CREATE TABLE password_reset_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operator_id uuid NOT NULL REFERENCES school_operators(id) ON DELETE RESTRICT,
 requested_at timestamptz NOT NULL DEFAULT now(), request_ip_hash varchar(128) NOT NULL, status "ResetRequestStatus" NOT NULL DEFAULT 'REQUESTED'
);
CREATE INDEX password_reset_requests_operator_idx ON password_reset_requests(operator_id,requested_at);
CREATE TABLE audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurred_at timestamptz NOT NULL DEFAULT now(), request_id varchar(64) NOT NULL,
 school_id uuid, actor_type varchar(32) NOT NULL, actor_id uuid, event_type varchar(96) NOT NULL, target_type varchar(64), target_id varchar(128),
 metadata_json jsonb, ip_hash varchar(128)
);
CREATE INDEX audit_logs_school_time_idx ON audit_logs(school_id,occurred_at); CREATE INDEX audit_logs_event_time_idx ON audit_logs(event_type,occurred_at); CREATE INDEX audit_logs_request_idx ON audit_logs(request_id);
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_logs are append-only'; END $$;
CREATE TRIGGER audit_logs_no_update_delete BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
CREATE TABLE audit_outbox (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz);
CREATE INDEX audit_outbox_pending_idx ON audit_outbox(delivered_at,created_at);
CREATE TABLE school_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
 file_type "FileType" NOT NULL, object_key varchar(512) UNIQUE NOT NULL, mime varchar(128) NOT NULL, size_bytes integer NOT NULL,
 sha256 varchar(64) NOT NULL, status "FileStatus" NOT NULL DEFAULT 'AVAILABLE', created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX school_files_school_type_status_idx ON school_files(school_id,file_type,status);
CREATE TABLE jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), school_id uuid REFERENCES schools(id) ON DELETE RESTRICT, actor_type varchar(32) NOT NULL,
 actor_id uuid NOT NULL, job_type "JobType" NOT NULL, status "JobStatus" NOT NULL DEFAULT 'QUEUED', input_snapshot_json jsonb,
 input_encrypted text, key_version varchar(32), output_file_id uuid, attempt_count integer NOT NULL DEFAULT 0, lease_until timestamptz,
 error_code varchar(96), created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, completed_at timestamptz
);
CREATE INDEX jobs_status_created_idx ON jobs(status,created_at); CREATE INDEX jobs_school_status_idx ON jobs(school_id,status);
CREATE TABLE job_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid UNIQUE NOT NULL, queue_name varchar(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz, attempt_count integer NOT NULL DEFAULT 0, last_error_code varchar(96)
);
CREATE INDEX job_outbox_pending_idx ON job_outbox(delivered_at,created_at);
CREATE TABLE transfer_certificates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tc_uuid uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(), school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
 student_id uuid NOT NULL, template_version varchar(64) NOT NULL, snapshot_ciphertext text NOT NULL, snapshot_iv varchar(64) NOT NULL,
 snapshot_tag varchar(64) NOT NULL, key_version varchar(32) NOT NULL, status "TcStatus" NOT NULL DEFAULT 'QUEUED', file_id uuid,
 job_id uuid UNIQUE NOT NULL, issued_by uuid NOT NULL, issued_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX tc_school_issued_idx ON transfer_certificates(school_id,issued_at); CREATE INDEX tc_school_student_issued_idx ON transfer_certificates(school_id,student_id,issued_at);
ALTER TABLE school_files ADD CONSTRAINT school_files_school_id_id_unique UNIQUE (school_id,id);
ALTER TABLE schools ADD CONSTRAINT school_logo_same_school_fk FOREIGN KEY (id,logo_file_id) REFERENCES school_files(school_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE school_principals ADD CONSTRAINT principal_signature_same_school_fk FOREIGN KEY (school_id,signature_file_id) REFERENCES school_files(school_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE transfer_certificates ADD CONSTRAINT tc_file_same_school_fk FOREIGN KEY (school_id,file_id) REFERENCES school_files(school_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE jobs ADD CONSTRAINT job_output_file_same_school_fk FOREIGN KEY (school_id,output_file_id) REFERENCES school_files(school_id,id) DEFERRABLE INITIALLY DEFERRED;
