import { ReadinessResponse, HealthCheckResult } from '@custom-school/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function fetchLiveness(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/health/live`);
  if (!res.ok) throw new Error('Liveness check failed');
  return res.json();
}

export async function fetchReadiness(): Promise<ReadinessResponse> {
  const res = await fetch(`${API_BASE_URL}/health/ready`);
  return res.json();
}

export async function fetchPublicHealth(): Promise<HealthCheckResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
