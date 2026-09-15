'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'SC';
}

function getAvatarColor(name: string) {
  const colors = [
    { bg: '#eff6ff', text: '#2563eb' }, // blue (e.g., GP)
    { bg: '#f5f3ff', text: '#7c3aed' }, // purple (e.g., DM)
    { bg: '#ecfdf5', text: '#059669' }, // emerald
    { bg: '#fff7ed', text: '#ea580c' }, // orange
    { bg: '#f0fdfa', text: '#0d9488' }, // teal
    { bg: '#fdf2f8', text: '#db2777' }, // pink
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % colors.length;
  return colors[hash];
}

function SchoolBuildingIcon({ size = 26, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h18" />
      <path d="M5 21V9l7-5 7 5v12" />
      <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
      <circle cx="12" cy="7" r="1" fill={color} />
      <line x1="8" y1="12" x2="8" y2="14" />
      <line x1="16" y1="12" x2="16" y2="14" />
    </svg>
  );
}

export default function SchoolsUi() {
  const [data, setData] = useState<any>();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const pageSize = 10;

  // Debounced search query for smooth live automatic search
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
    }, 150);
    return () => clearTimeout(timer);
  }, [q]);

  // When search query or status changes, reset to page 1
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setPage(1);
  }, [debouncedQ, status]);

  // Fetch schools function
  const fetchSchools = (queryStr = debouncedQ, statusVal = status, targetPage = page) => {
    let active = true;
    setLoading(true);

    const queryParam = queryStr.trim();
    api(`/platform/schools?q=${encodeURIComponent(queryParam)}&status=${statusVal}&page=${targetPage}&pageSize=${pageSize}`)
      .then((res) => {
        if (active) {
          setData(res);
          setErr('');
        }
      })
      .catch((e) => {
        if (active) setErr(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  };

  // Fetch schools whenever page, debouncedQ, or status changes
  useEffect(() => {
    return fetchSchools(debouncedQ, status, page);
  }, [debouncedQ, status, page]);

  // Close actions dropdown when clicking anywhere outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-actions-menu]')) {
        setOpenActionId(null);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.pages || 1);
  const startCount = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endCount = Math.min(page * pageSize, total);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100%',
        paddingBottom: 48,
        overflow: 'hidden',
      }}
    >
      {/* Subtle Background Decorative Graphic Accents */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          left: -80,
          width: 500,
          height: 400,
          background: 'radial-gradient(ellipse at center, rgba(186, 230, 253, 0.45) 0%, rgba(224, 242, 254, 0.2) 50%, transparent 80%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: -40,
          width: 320,
          height: 480,
          backgroundImage: 'radial-gradient(#93c5fd 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          opacity: 0.35,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="dashboard-content-container"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1280,
          margin: '0 auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
          <Link
            href="/admin/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#2563eb',
              textDecoration: 'none',
              transition: 'opacity 0.15s ease',
            }}
            title="Home"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
          <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>Schools</span>
        </div>

        {/* Page Header Area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Left Title with School Icon */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)',
                border: '1px solid #dbeafe',
              }}
            >
              <SchoolBuildingIcon size={26} color="#2563eb" />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.2,
                }}
              >
                Schools
              </h1>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Manage and view all registered schools on the platform.
              </p>
            </div>
          </div>

          {/* Right Area: Branding Badge + Add School Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Build Better Education Badge */}
            <div
              className="desktop-only"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#ffffff',
                padding: '8px 16px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SchoolBuildingIcon size={20} color="#2563eb" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  Build Better Education
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>
                  One School at a Time
                </span>
              </div>
            </div>

            {/* + Add School Primary Button */}
            <Link
              href="/admin/schools/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#2563eb',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1d4ed8';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(37, 99, 235, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2563eb';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.25)';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add School</span>
            </Link>
          </div>
        </div>

        {/* Search & Filter Card */}
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Search by Name or School UUID */}
          <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="q" style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              Search name or School UUID
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type to search (e.g. Greenfield or SCH-00125)..."
                autoComplete="off"
                style={{
                  width: '100%',
                  height: 44,
                  padding: '10px 40px 10px 42px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 14,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {/* Inline Loading Spinner or Clear Button */}
              {loading || q !== debouncedQ ? (
                <div
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg
                    style={{
                      animation: 'spin 0.75s linear infinite',
                      width: 16,
                      height: 16,
                    }}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle cx="12" cy="12" r="10" stroke="#cbd5e1" strokeWidth="3" />
                    <path
                      fill="#2563eb"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : q ? (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  title="Clear search"
                  aria-label="Clear search"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: '#e2e8f0',
                    color: '#475569',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 200, minWidth: 160 }}>
            <label htmlFor="status" style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              Status
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: '100%',
                  height: 44,
                  padding: '10px 36px 10px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#0f172a',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">All</option>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748b',
                  display: 'flex',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>
        </form>

        {/* Error Notification */}
        {err && (
          <div
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 12,
              padding: '14px 18px',
              color: '#991b1b',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{err}</span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: 12, background: '#ffffff' }}
              onClick={() => {
                setErr('');
                fetchSchools(debouncedQ, status, page);
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* School Directory Table Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.04)',
            overflow: 'visible',
          }}
        >
          {/* Card Header with Counter */}
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SchoolBuildingIcon size={18} color="#2563eb" />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                Schools
              </h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  background: '#f1f5f9',
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: '1px solid #e2e8f0',
                }}
              >
                {loading ? 'Updating…' : `${total} schools`}
              </span>
            </div>

            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              Showing {startCount}-{endCount} of {total} schools
            </div>
          </div>

          {/* Table View */}
          <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
            <div className="desktop-table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', width: 48, textAlign: 'center' }}>
                      #
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                      School
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                      School UUID
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                      Status
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                      Operators
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!data?.items || data.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '56px 16px', color: '#64748b' }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>No schools found</div>
                        <div style={{ fontSize: 13, marginTop: 6 }}>
                          No schools match your search query or filter criteria.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.items.map((s: any, idx: number) => {
                      const rowNumber = (page - 1) * pageSize + idx + 1;
                      const avatar = getAvatarColor(s.name);
                      const initials = getInitials(s.name);

                      // Semantic status styles
                      let statusBadge = {
                        bg: '#f1f5f9',
                        border: '#cbd5e1',
                        color: '#475569',
                      };
                      if (s.status === 'ACTIVE') {
                        statusBadge = {
                          bg: '#ecfdf5',
                          border: '#a7f3d0',
                          color: '#047857',
                        };
                      } else if (s.status === 'INACTIVE') {
                        statusBadge = {
                          bg: '#fef2f2',
                          border: '#fecaca',
                          color: '#b91c1c',
                        };
                      }

                      return (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {/* # Row Number */}
                          <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>
                            {rowNumber}
                          </td>

                          {/* School Avatar + Name & Location */}
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  background: avatar.bg,
                                  color: avatar.text,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  flexShrink: 0,
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <Link
                                  href={`/admin/schools/${s.id}`}
                                  style={{
                                    fontWeight: 700,
                                    fontSize: 14,
                                    color: '#0f172a',
                                    textDecoration: 'none',
                                    display: 'inline-block',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#2563eb';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#0f172a';
                                  }}
                                >
                                  {s.name}
                                </Link>
                                {s.address && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: '#64748b',
                                      marginTop: 2,
                                      maxWidth: 320,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {s.address}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* School UUID Badge */}
                          <td style={{ padding: '16px 20px' }}>
                            <code
                              style={{
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#2563eb',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                padding: '4px 10px',
                                borderRadius: 6,
                                letterSpacing: '0.4px',
                              }}
                            >
                              {s.id}
                            </code>
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: '16px 20px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                background: statusBadge.bg,
                                border: `1px solid ${statusBadge.border}`,
                                color: statusBadge.color,
                                letterSpacing: '0.5px',
                              }}
                            >
                              {s.status}
                            </span>
                          </td>

                          {/* Operators Count */}
                          <td style={{ padding: '16px 20px', fontSize: 13, color: '#334155', fontWeight: 600 }}>
                            {s._count?.operators ?? 0}
                          </td>

                          {/* Actions: View Button & Three-Dots Menu */}
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, position: 'relative' }} data-actions-menu>
                              <Link
                                href={`/admin/schools/${s.id}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  textDecoration: 'none',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#2563eb';
                                  e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#eff6ff';
                                  e.currentTarget.style.color = '#2563eb';
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                <span>View</span>
                              </Link>

                              {/* Three-dots menu trigger */}
                              <button
                                type="button"
                                aria-label="More actions"
                                onClick={() => setOpenActionId(openActionId === s.id ? null : s.id)}
                                style={{
                                  background: openActionId === s.id ? '#f1f5f9' : 'transparent',
                                  border: 'none',
                                  borderRadius: 6,
                                  width: 28,
                                  height: 28,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease, color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#f1f5f9';
                                  e.currentTarget.style.color = '#0f172a';
                                }}
                                onMouseLeave={(e) => {
                                  if (openActionId !== s.id) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#64748b';
                                  }
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="2" />
                                  <circle cx="12" cy="12" r="2" />
                                  <circle cx="12" cy="19" r="2" />
                                </svg>
                              </button>

                              {/* Dropdown Menu */}
                              {openActionId === s.id && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 34,
                                    width: 190,
                                    background: '#ffffff',
                                    borderRadius: 10,
                                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.08)',
                                    zIndex: 40,
                                    padding: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    textAlign: 'left',
                                  }}
                                >
                                  <Link
                                    href={`/admin/schools/${s.id}`}
                                    onClick={() => setOpenActionId(null)}
                                    style={{
                                      padding: '8px 12px',
                                      fontSize: 13,
                                      fontWeight: 500,
                                      color: '#1e293b',
                                      textDecoration: 'none',
                                      borderRadius: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#f8fafc';
                                      e.currentTarget.style.color = '#2563eb';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = '#1e293b';
                                    }}
                                  >
                                    <span>View Profile</span>
                                  </Link>
                                  <Link
                                    href={`/admin/schools/${s.id}/operators`}
                                    onClick={() => setOpenActionId(null)}
                                    style={{
                                      padding: '8px 12px',
                                      fontSize: 13,
                                      fontWeight: 500,
                                      color: '#1e293b',
                                      textDecoration: 'none',
                                      borderRadius: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#f8fafc';
                                      e.currentTarget.style.color = '#2563eb';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = '#1e293b';
                                    }}
                                  >
                                    <span>Manage Operators</span>
                                  </Link>
                                  <Link
                                    href={`/admin/schools/${s.id}/academics`}
                                    onClick={() => setOpenActionId(null)}
                                    style={{
                                      padding: '8px 12px',
                                      fontSize: 13,
                                      fontWeight: 500,
                                      color: '#1e293b',
                                      textDecoration: 'none',
                                      borderRadius: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#f8fafc';
                                      e.currentTarget.style.color = '#2563eb';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = '#1e293b';
                                    }}
                                  >
                                    <span>Academic Classes</span>
                                  </Link>
                                  <Link
                                    href={`/admin/schools/${s.id}/transfer-certificate`}
                                    onClick={() => setOpenActionId(null)}
                                    style={{
                                      padding: '8px 12px',
                                      fontSize: 13,
                                      fontWeight: 500,
                                      color: '#1e293b',
                                      textDecoration: 'none',
                                      borderRadius: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#f8fafc';
                                      e.currentTarget.style.color = '#2563eb';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.color = '#1e293b';
                                    }}
                                  >
                                    <span>Transfer Certificates</span>
                                  </Link>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stack View */}
            <div className="mobile-card-stack" style={{ display: 'none', padding: '12px', gap: 12 }}>
              {!data?.items || data.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                  No schools found.
                </div>
              ) : (
                data.items.map((s: any, idx: number) => {
                  const avatar = getAvatarColor(s.name);
                  const initials = getInitials(s.name);
                  return (
                    <div
                      key={s.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: avatar.bg,
                              color: avatar.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <Link href={`/admin/schools/${s.id}`} style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                              {s.name}
                            </Link>
                            {s.address && <div style={{ fontSize: 12, color: '#64748b' }}>{s.address}</div>}
                          </div>
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 800,
                            background: s.status === 'ACTIVE' ? '#ecfdf5' : s.status === 'INACTIVE' ? '#fef2f2' : '#f1f5f9',
                            color: s.status === 'ACTIVE' ? '#047857' : s.status === 'INACTIVE' ? '#b91c1c' : '#475569',
                          }}
                        >
                          {s.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                        <div>
                          <code style={{ fontFamily: 'monospace', fontSize: 11, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: 4 }}>
                            {s.id}
                          </code>
                        </div>
                        <div style={{ color: '#64748b' }}>
                          Operators: <strong style={{ color: '#0f172a' }}>{s._count?.operators ?? 0}</strong>
                        </div>
                        <Link
                          href={`/admin/schools/${s.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            textDecoration: 'none',
                          }}
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination Controls Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              background: '#ffffff',
            }}
          >
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: page <= 1 ? '#f8fafc' : '#ffffff',
                color: page <= 1 ? '#94a3b8' : '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Previous</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
              <span>Page</span>
              <strong style={{ color: '#0f172a', fontWeight: 700 }}>{page}</strong>
              <span>of</span>
              <strong style={{ color: '#0f172a', fontWeight: 700 }}>{totalPages}</strong>
            </div>

            <button
              type="button"
              disabled={!data || page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: !data || page >= totalPages ? '#f8fafc' : '#ffffff',
                color: !data || page >= totalPages ? '#94a3b8' : '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: !data || page >= totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Next</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
