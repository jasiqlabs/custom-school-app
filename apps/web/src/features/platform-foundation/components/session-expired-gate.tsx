import React from 'react';

export interface SessionExpiredGateProps {
  isOpen: boolean;
  onLoginRedirect: () => void;
}

export const SessionExpiredGate: React.FC<SessionExpiredGateProps> = ({
  isOpen,
  onLoginRedirect,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '440px',
          width: '90%',
          boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1))',
          textAlign: 'center',
        }}
      >
        <h2
          id="session-expired-title"
          style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary, #0f172a)',
          }}
        >
          Session Expired
        </h2>
        <p
          id="session-expired-desc"
          style={{
            margin: '0 0 24px 0',
            fontSize: '14px',
            color: 'var(--text-secondary, #475569)',
            lineHeight: 1.5,
          }}
        >
          Your authenticated session has expired due to inactivity. Please sign in again to continue your work.
        </p>
        <button
          type="button"
          onClick={onLoginRedirect}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'var(--color-brand-primary-600, #2563eb)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'var(--focus-ring, 2px solid #2563eb)',
          }}
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
};
