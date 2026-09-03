import { useState, useEffect, useCallback } from 'react';
import { fetchReadiness } from '../api/health-api';
import { ReadinessResponse } from '@custom-school/contracts';

export function useHealthStatus(pollIntervalMs = 30000) {
  const [status, setStatus] = useState<'ready' | 'not_ready' | 'loading'>('loading');
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetchReadiness();
      setData(res);
      setStatus(res.status);
      setError(null);
    } catch (err: any) {
      setStatus('not_ready');
      setError(err);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, pollIntervalMs);
    return () => clearInterval(interval);
  }, [checkHealth, pollIntervalMs]);

  return { status, data, error, refetch: checkHealth };
}
