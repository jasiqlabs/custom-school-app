'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

interface SchoolHeaderProps {
  school?: {
    id: string;
    name: string;
    status: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logoFileId?: string | null;
  } | null;
  schoolId: string;
  logoUrl?: string | null;
  onStatusChange?: (newStatus: string) => void | Promise<void>;
  onEditSchool?: () => void;
  loading?: boolean;
}

export function SchoolHeader({
  school,
  schoolId,
  logoUrl,
  onStatusChange,
  onEditSchool,
  loading = false,
}: SchoolHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    }
    if (actionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionsOpen]);

  async function copySchoolId() {
    const idToCopy = school?.id || schoolId;
    if (!idToCopy) return;
    try {
      await navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback if clipboard api fails
    }
  }

  async function handleToggleStatus(targetStatus: 'ACTIVE' | 'INACTIVE') {
    setActionsOpen(false);
    if (targetStatus === 'INACTIVE') {
      if (!confirm('Deactivate school and revoke operator sessions?')) return;
    }
    setActionLoading(true);
    try {
      await api(`/platform/schools/${schoolId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: targetStatus }),
      });
      if (onStatusChange) {
        await onStatusChange(targetStatus);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to update school status');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !school) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 104,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 12,
              background: '#f1f5f9',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 220, height: 20, background: '#f1f5f9', borderRadius: 4 }} />
            <div style={{ width: 140, height: 14, background: '#f1f5f9', borderRadius: 4 }} />
          </div>
        </div>
      </div>
    );
  }

  const isActive = school.status === 'ACTIVE';
  const isInactive = school.status === 'INACTIVE';

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Left Area: Logo & Information */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 260 }}>
        {/* School Logo or Fallback Emblem */}
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={school.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="9" y1="7" x2="16" y2="7" />
              <line x1="9" y1="11" x2="14" y2="11" />
            </svg>
          )}
        </div>

        {/* School Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Row 1: Name + Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.3,
              }}
            >
              {school.name}
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 10px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                background: isActive ? '#ecfdf5' : '#f1f5f9',
                color: isActive ? '#047857' : isInactive ? '#475569' : '#b45309',
                border: `1px solid ${isActive ? '#a7f3d0' : isInactive ? '#cbd5e1' : '#fde68a'}`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isActive ? '#10b981' : isInactive ? '#94a3b8' : '#f59e0b',
                }}
              />
              {isActive ? 'Active' : isInactive ? 'Inactive' : school.status}
            </span>
          </div>

          {/* Row 2: School ID with copy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                padding: '1px 7px',
                borderRadius: 5,
              }}
            >
              {school.id}
            </span>
            <button
              type="button"
              onClick={copySchoolId}
              title={copied ? 'Copied to clipboard!' : 'Copy School ID'}
              aria-label="Copy School ID"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '2px 5px',
                cursor: 'pointer',
                color: copied ? '#059669' : '#64748b',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>

          {/* Row 3: Address / Location (if present) */}
          {school.address && (
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              {school.address}
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Actions */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          type="button"
          onClick={() => setActionsOpen(!actionsOpen)}
          disabled={actionLoading}
          aria-haspopup="true"
          aria-expanded={actionsOpen}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#1e293b',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          <span>More actions</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: actionsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {actionsOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              width: 200,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              zIndex: 30,
              padding: '6px 0',
            }}
          >
            {onEditSchool && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setActionsOpen(false);
                  onEditSchool();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 16px',
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#1e293b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit School Details
              </button>
            )}

            {!isActive ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleToggleStatus('ACTIVE')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 16px',
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#059669',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ecfdf5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Activate School
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleToggleStatus('INACTIVE')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 16px',
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#dc2626',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                Deactivate School
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
