'use client';

import React from 'react';

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  availability?: 'AVAILABLE' | 'UNAVAILABLE';
  generatedAt?: string;
  reason?: string;
  loading?: boolean;
  onRefresh?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function WidgetCard({
  title,
  subtitle,
  icon,
  availability = 'AVAILABLE',
  generatedAt,
  reason,
  loading = false,
  onRefresh,
  actions,
  children,
}: WidgetCardProps) {
  const formattedTime = generatedAt
    ? new Date(generatedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: 10,
          background: 'linear-gradient(to right, #fafbfc, #ffffff)',
          minHeight: 56,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 1 }}>
          {icon && (
            <div
              style={{
                width: 32,
                height: 32,
                minWidth: 32,
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              {icon}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: 12,
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {formattedTime && (
            <span
              style={{
                fontSize: 11,
                color: '#64748b',
                background: '#f8fafc',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
              }}
              title={`Generated at: ${generatedAt}`}
            >
              Synced: {formattedTime}
            </span>
          )}

          {actions}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh widget"
              style={{
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                borderRadius: 6,
                padding: '4px 8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                color: '#475569',
                transition: 'background 0.15s ease',
                whiteSpace: 'nowrap',
                height: 28,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div
            style={{
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: '#64748b',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                border: '3px solid #e2e8f0',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Updating widget data...</span>
          </div>
        ) : availability === 'UNAVAILABLE' ? (
          <div
            style={{
              padding: 24,
              borderRadius: 12,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 12,
              margin: 'auto 0',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#991b1b' }}>
                Service Temporarily Unavailable
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#b91c1c', maxWidth: 360 }}>
                {reason || 'The upstream domain capability did not respond in time. No false zero values were recorded.'}
              </p>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retry Request
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
