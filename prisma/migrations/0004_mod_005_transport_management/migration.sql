CREATE TYPE "TransportStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'ENDED');

CREATE TABLE transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  name varchar(100) NOT NULL,
  normalized_name varchar(100) NOT NULL,
  transport_number varchar(50) NOT NULL,
  vehicle_number varchar(50),
  pickup_time varchar(16),
  drop_time varchar(16),
  status "TransportStatus" NOT NULL DEFAULT 'ACTIVE',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, normalized_name),
  UNIQUE (school_id, transport_number)
);

CREATE INDEX transports_school_status_idx ON transports(school_id, status);

CREATE TABLE transport_stoppages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  transport_id uuid NOT NULL REFERENCES transports(id) ON DELETE RESTRICT,
  name varchar(100) NOT NULL,
  normalized_name varchar(100) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status "TransportStatus" NOT NULL DEFAULT 'ACTIVE',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, transport_id, normalized_name)
);

CREATE INDEX transport_stoppages_school_transport_order_idx ON transport_stoppages(school_id, transport_id, sort_order);
CREATE INDEX transport_stoppages_school_status_idx ON transport_stoppages(school_id, status);

CREATE TABLE transport_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id varchar(36) NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  transport_id uuid NOT NULL REFERENCES transports(id) ON DELETE RESTRICT,
  stoppage_id uuid NOT NULL REFERENCES transport_stoppages(id) ON DELETE RESTRICT,
  status "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  service_start_date date,
  service_end_date date,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ended_reason varchar(255),
  created_by uuid,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_service_dates CHECK (
    service_start_date IS NULL OR service_end_date IS NULL OR service_end_date >= service_start_date
  )
);

CREATE INDEX transport_assignments_school_student_status_idx ON transport_assignments(school_id, student_id, status);
CREATE INDEX transport_assignments_school_transport_status_idx ON transport_assignments(school_id, transport_id, status);
CREATE INDEX transport_assignments_school_stoppage_status_idx ON transport_assignments(school_id, stoppage_id, status);

-- Partial unique index ensuring at most one ACTIVE assignment per student per school
CREATE UNIQUE INDEX transport_assignments_one_active_per_student ON transport_assignments (school_id, student_id) WHERE status = 'ACTIVE';
