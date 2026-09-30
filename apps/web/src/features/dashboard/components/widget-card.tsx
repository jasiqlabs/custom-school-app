'use client';

import React, { useState, useEffect } from 'react';

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 10) {
    return 'Updated just now';
  }
  if (diffInSeconds < 60) {
    return `Updated ${diffInSeconds}s ago`;
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) {
    return 'Updated 1 min ago';
  }
  if (diffInMinutes < 60) {
    return `Updated ${diffInMinutes} min ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) {
    return 'Updated 1 hr ago';
  }
  if (diffInHours < 24) {
    return `Updated ${diffInHours} hrs ago`;
  }
  return `Updated on ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
}

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
  timestampPosition?: 'top' | 'bottom' | 'none';
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
  timestampPosition = 'top',
  children,
}: WidgetCardProps) {
  const formattedTime = generatedAt
    ? new Date(generatedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(generatedAt));

  useEffect(() => {
    setRelativeTime(formatRelativeTime(generatedAt));
    const timer = setInterval(() => {
      setRelativeTime(formatRelativeTime(generatedAt));
    }, 15000);
    return () => clearInterval(timer);
  }, [generatedAt]);

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
          padding: '14px 18px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px 14px',
          background: 'linear-gradient(to right, #fafbfc, #ffffff)',
          minHeight: 56,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 'fit-content', flexShrink: 1 }}>
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
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
                wordBreak: 'break-word',
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
                  lineHeight: 1.3,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {timestampPosition === 'top' && formattedTime && (
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

      {/* Bottom Relative Timestamp */}
      {timestampPosition === 'bottom' && relativeTime && (
        <div
          style={{
            padding: '8px 18px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafbfc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#64748b',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontWeight: 500 }}>{relativeTime}</span>
          </span>
          {formattedTime && (
            <span style={{ fontSize: 10, color: '#94a3b8' }} title={`Exact time: ${formattedTime}`}>
              {formattedTime}
            </span>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
