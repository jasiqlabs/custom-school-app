import React from 'react';

export interface AdminShellLayoutProps {
  children: React.ReactNode;
  userName?: string;
  onLogout?: () => void;
}

export const AdminShellLayout: React.FC<AdminShellLayoutProps> = ({
  children,
  userName = 'Platform Administrator',
  onLogout,
}) => {
  return (
    <div className="admin-shell-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* WCAG 2.4.1 Skip Link */}
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
            Custom School Admin
          </span>
          <span
            style={{
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'var(--color-brand-primary-50, #eff6ff)',
              color: 'var(--color-brand-primary-700, #1d4ed8)',
              borderRadius: '9999px',
            }}
          >
            Platform Plane
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
          aria-label="Platform Admin Navigation"
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
                href="/admin/dashboard"
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
                Dashboard
              </a>
            </li>
            <li>
              <a
                href="/admin/schools"
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
                Schools Directory
              </a>
            </li>
            <li>
              <a
                href="/admin/audit"
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
                Audit Trail
              </a>
            </li>
            <li>
              <a
                href="/admin/settings"
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
                Platform Settings
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
