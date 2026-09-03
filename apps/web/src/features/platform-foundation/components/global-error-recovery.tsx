import React from 'react';

export interface GlobalErrorRecoveryProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const GlobalErrorRecovery: React.FC<GlobalErrorRecoveryProps> = ({
  title = 'Service Temporarily Unavailable',
  message = 'The application server or background database is momentarily unreachable. Our automated probes are monitoring recovery.',
  onRetry,
}) => {
  return (
    <div
      role="region"
      aria-label="Service Error Notification"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app, #f8fafc)',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--color-warning-50, #fffbeb)',
            color: 'var(--color-warning-700, #b45309)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            margin: '0 auto 16px auto',
          }}
        >
          !
        </div>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-primary, #0f172a)',
            margin: '0 0 12px 0',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary, #475569)',
            lineHeight: 1.6,
            margin: '0 0 24px 0',
          }}
        >
          {message}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: '10px 20px',
              background: 'var(--color-brand-primary-600, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Check Status & Retry
          </button>
        )}
      </div>
    </div>
  );
};
