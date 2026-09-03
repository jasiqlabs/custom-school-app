export interface SubsystemHealth {
  status: 'up' | 'down';
  latencyMs?: number;
  message?: string;
}

export interface HealthCheckResult {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  version?: string;
  checks?: {
    database: SubsystemHealth;
    redis: SubsystemHealth;
    minio: SubsystemHealth;
  };
}

export interface LivenessResponse {
  status: 'ok';
  service: string;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  service: string;
  checks: {
    database: SubsystemHealth;
    redis: SubsystemHealth;
    minio: SubsystemHealth;
  };
}
