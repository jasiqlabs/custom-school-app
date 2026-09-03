import React from 'react';

export default function HomePage() {
  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app, #f8fafc)',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '12px',
          padding: '36px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1))',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '0 0 12px 0' }}>
          Custom School Management Platform
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary, #475569)', lineHeight: 1.6, margin: '0 0 28px 0' }}>
          Secure, multi-tenant school operations, student records, fee collection, and reporting infrastructure.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <a
            href="/admin/schools"
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              background: 'var(--color-brand-primary-600, #2563eb)',
              color: '#ffffff',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Platform Admin Plane
          </a>
          <a
            href="/operator/students"
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              background: 'var(--bg-surface-elevated, #f1f5f9)',
              color: 'var(--text-primary, #0f172a)',
              border: '1px solid var(--border-strong, #cbd5e1)',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            School Operator Plane
          </a>
        </div>
      </div>
    </main>
  );
}
