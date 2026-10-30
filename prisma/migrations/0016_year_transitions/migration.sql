BEGIN;

ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'STAGED';

CREATE TABLE year_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  source_session_id uuid NOT NULL REFERENCES academic_sessions(id) ON DELETE RESTRICT,
  target_session_id uuid NOT NULL REFERENCES academic_sessions(id) ON DELETE RESTRICT,
  status varchar(24) NOT NULL DEFAULT 'DRAFT',
  version int NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT year_transition_distinct_years CHECK (source_session_id <> target_session_id),
  CONSTRAINT year_transition_unique UNIQUE (school_id,source_session_id,target_session_id)
);
CREATE INDEX year_transition_school_status_idx ON year_transitions(school_id,status);

CREATE TABLE year_transition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transition_id uuid NOT NULL REFERENCES year_transitions(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  source_enrollment_id uuid NOT NULL REFERENCES student_enrollments(id) ON DELETE RESTRICT,
  source_version int NOT NULL,
  decision varchar(16) NOT NULL,
  target_class_id uuid REFERENCES classes(id) ON DELETE RESTRICT,
  target_section_id uuid REFERENCES sections(id) ON DELETE RESTRICT,
  staged_enrollment_id uuid REFERENCES student_enrollments(id) ON DELETE RESTRICT,
  status varchar(24) NOT NULL DEFAULT 'PREPARED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT year_transition_item_unique UNIQUE (transition_id,student_id),
  CONSTRAINT year_transition_decision CHECK (decision IN ('PROMOTE','REPEAT','PASS_OUT','LEAVE')),
  CONSTRAINT year_transition_decision_target CHECK (
    (decision IN ('PROMOTE','REPEAT') AND target_class_id IS NOT NULL AND target_section_id IS NOT NULL)
    OR (decision IN ('PASS_OUT','LEAVE') AND target_class_id IS NULL AND target_section_id IS NULL)
  )
);
CREATE INDEX year_transition_items_status_idx ON year_transition_items(transition_id,status);

COMMIT;
