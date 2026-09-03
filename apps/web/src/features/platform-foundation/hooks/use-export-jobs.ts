import { useState, useCallback } from 'react';
import { JobRecord } from '@custom-school/contracts';

export function useExportJobs() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  const toggleTray = useCallback(() => {
    setIsTrayOpen((prev) => !prev);
  }, []);

  const addJob = useCallback((job: JobRecord) => {
    setJobs((prev) => [job, ...prev]);
  }, []);

  const updateJob = useCallback((updatedJob: JobRecord) => {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
  }, []);

  return {
    jobs,
    isTrayOpen,
    toggleTray,
    addJob,
    updateJob,
  };
}
