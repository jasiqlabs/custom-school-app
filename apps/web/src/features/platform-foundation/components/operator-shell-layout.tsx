import React from 'react';

export interface OperatorShellLayoutProps {
  children: React.ReactNode;
  schoolName?: string;
  userName?: string;
  academicYear?: string;
  onLogout?: () => void;
}

export const OperatorShellLayout: React.FC<OperatorShellLayoutProps> = ({
  children,
  schoolName = 'Al-Noor Model Academy',
  userName = 'Operator Account',
  academicYear = '2026-2027',
  onLogout,
}) => {
  return (
    <div className="operator-shell-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Skip Link for Keyboard Users */}
      <a
        href="#main-content"
        className="skip-link"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          zIndex: 9999,
          padding: '8px 16px',
          background: 'var(--color-brand-primary-600, #2563eb)',
          color: '#ffffff',
          fontWeight: 600,
          textDecoration: 'none',
          borderRadius: '4px',
        }}
        onFocus={(e) => {
          e.currentTarget.style.position = 'fixed';
          e.currentTarget.style.left = '16px';
          e.currentTarget.style.top = '16px';
          e.currentTarget.style.width = 'auto';
          e.currentTarget.style.height = 'auto';
        }}
        onBlur={(e) => {
          e.currentTarget.style.position = 'absolute';
          e.currentTarget.style.left = '-9999px';
          e.currentTarget.style.width = '1px';
          e.currentTarget.style.height = '1px';
        }}
      >
        Skip to main content
      </a>

      {/* Header Landmark */}
      <header
        role="banner"
        style={{
          height: '64px',
          background: 'var(--bg-surface, #ffffff)',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
            {schoolName}
          </span>
          <span
            style={{
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'var(--color-success-50, #f0fdf4)',
              color: 'var(--color-success-700, #15803d)',
              borderRadius: '9999px',
            }}
          >
            AY {academicYear}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary, #475569)' }}>{userName}</span>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-danger-700, #b91c1c)',
                background: 'transparent',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Navigation Landmark */}
        <nav
          aria-label="School Operator Navigation"
          style={{
            width: '240px',
            background: 'var(--bg-surface-elevated, #f8fafc)',
            borderRight: '1px solid var(--border-subtle, #e2e8f0)',
            padding: '24px 16px',
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <a
                href="/operator/students"
                style={{
                  display: 'block',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-primary, #0f172a)',
                  textDecoration: 'none',
                }}
              >
                Students
              </a>
            </li>
            <li>
              <a
                href="/operator/fees"
                style={{
                  display: 'block',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-secondary, #475569)',
                  textDecoration: 'none',
                }}
              >
                Fees & Collections
              </a>
            </li>
            <li>
              <a
                href="/operator/transport"
                style={{
                  display: 'block',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-secondary, #475569)',
                  textDecoration: 'none',
                }}
              >
                Transport
              </a>
            </li>
            <li>
              <a
                href="/operator/reports"
                style={{
                  display: 'block',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-secondary, #475569)',
                  textDecoration: 'none',
                }}
              >
                Reports
              </a>
            </li>
          </ul>
        </nav>

        {/* Main Content Landmark */}
        <main
          id="main-content"
          role="main"
          style={{
            flex: 1,
            padding: '32px',
            background: 'var(--bg-app, #f8fafc)',
            outline: 'none',
          }}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
