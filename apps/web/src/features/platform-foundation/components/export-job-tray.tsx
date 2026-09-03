import React from 'react';
import { JobRecord } from '@custom-school/contracts';

export interface ExportJobTrayProps {
  jobs: JobRecord[];
  isOpen: boolean;
  onToggle: () => void;
  onDownloadFile?: (fileId: string) => void;
}

export const ExportJobTray: React.FC<ExportJobTrayProps> = ({
  jobs,
  isOpen,
  onToggle,
  onDownloadFile,
}) => {
  const activeCount = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'PROCESSING').length;

  return (
    <aside
      aria-label="Background Export Jobs"
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9000,
      }}
    >
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="export-job-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'var(--color-neutral-900, #0f172a)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '9999px',
          boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span>Exports & Jobs</span>
        {activeCount > 0 && (
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '9999px',
              background: 'var(--color-brand-primary-500, #3b82f6)',
              color: '#ffffff',
              fontSize: '11px',
            }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <div
          id="export-job-panel"
          style={{
            position: 'absolute',
            bottom: '48px',
            right: 0,
            width: '320px',
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              Background Tasks
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>{jobs.length} total</span>
          </div>

          {jobs.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #475569)', margin: 0 }}>
              No active or recent background jobs.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {jobs.map((job) => (
                <li
                  key={job.id}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    background: 'var(--bg-surface-elevated, #f8fafc)',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{job.jobType}</span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background:
                          job.status === 'COMPLETED'
                            ? 'var(--color-success-50, #f0fdf4)'
                            : job.status === 'FAILED'
                            ? 'var(--color-danger-50, #fef2f2)'
                            : 'var(--color-brand-primary-50, #eff6ff)',
                        color:
                          job.status === 'COMPLETED'
                            ? 'var(--color-success-700, #15803d)'
                            : job.status === 'FAILED'
                            ? 'var(--color-danger-700, #b91c1c)'
                            : 'var(--color-brand-primary-700, #1d4ed8)',
                      }}
                    >
                      {job.status}
                    </span>
                  </div>

                  {job.status === 'COMPLETED' && job.fileId && onDownloadFile && (
                    <button
                      type="button"
                      onClick={() => onDownloadFile(job.fileId!)}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--color-brand-primary-600, #2563eb)',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      Download File
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
};
