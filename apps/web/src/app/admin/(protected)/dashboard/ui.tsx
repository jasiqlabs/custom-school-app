'use client';

import { useEffect, useRef, useState } from 'react';
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
    { bg: '#eff6ff', text: '#1d4ed8' }, // blue
    { bg: '#f5f3ff', text: '#6d28d9' }, // purple
    { bg: '#ecfdf5', text: '#047857' }, // emerald
    { bg: '#fff7ed', text: '#c2410c' }, // orange
    { bg: '#f0fdfa', text: '#0f766e' }, // teal
    { bg: '#fdf2f8', text: '#be185d' }, // pink
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % colors.length;
  return colors[hash];
}

export default function DashboardUi() {
  const [m, setM] = useState<any>();
  const [s, setS] = useState<any>();
  const [e, setE] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  // Set formatted current date/time on mount (avoids SSR hydration mismatches)
  useEffect(() => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    setCurrentDateStr(`${dateFormatted} • ${timeFormatted}`);
  }, []);

  // Load metrics on mount
  useEffect(() => {
    api('/platform/dashboard/metrics')
      .then(setM)
      .catch((x) => setE(x.message));
  }, []);

  // Debounced search query for smooth responsive typing
  const [debouncedQ, setDebouncedQ] = useState('');
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

  // Fetch schools whenever page, debouncedQ, or status changes
  useEffect(() => {
    let active = true;
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    });
    if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
    if (status) params.set('status', status);

    api(`/platform/dashboard/schools?${params.toString()}`)
      .then((data) => {
        if (active) {
          setS(data);
          setE('');
        }
      })
      .catch((err) => {
        if (active) setE(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, debouncedQ, status]);

  const totalPages = Math.max(1, s?.pages || 1);

  // Generate page numbers for direct navigation
  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Formatting date for last activity
  const formatLastActivity = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="dashboard-content-container" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mini Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>&rsaquo;</span>
        <span style={{ fontWeight: 600, color: '#334155' }}>Dashboard</span>
      </div>

      {/* Dashboard Heading Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
            }}
          >
            Platform Dashboard
          </h1>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: 14,
              color: '#64748b',
            }}
          >
            School portfolio overview without unnecessary student PII.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {currentDateStr && (
            <div
              className="desktop-only"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#64748b',
                background: '#ffffff',
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{currentDateStr}</span>
            </div>
          )}

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
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add School</span>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {e && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '14px 18px',
            color: '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 14,
          }}
        >
          <span>{e}</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 12px', fontSize: 12, background: '#ffffff' }}
            onClick={() => {
              setE('');
              setLoading(true);
              const params = new URLSearchParams({ page: String(page), pageSize: '10' });
              if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
              if (status) params.set('status', status);
              api(`/platform/dashboard/schools?${params.toString()}`)
                .then((data) => {
                  setS(data);
                  setE('');
                })
                .catch((err) => setE(err.message))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI / Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16,
        }}
      >
        {/* Total Schools Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 2px 10px rgba(15,23,42,0.03)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M12 3l9 4H3l9-4z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Total Schools</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.15, marginTop: 4 }}>
              {m?.totalSchools ?? '—'}
            </div>
          </div>
        </div>

        {/* Active Schools Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 2px 10px rgba(15,23,42,0.03)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M12 3l9 4H3l9-4z" />
              <polyline points="9 13 11 15 15 10" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Active Schools</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.15, marginTop: 4 }}>
              {m?.activeSchools ?? '—'}
            </div>
          </div>
        </div>

        {/* Inactive Schools Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 2px 10px rgba(15,23,42,0.03)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#fff7ed',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M12 3l9 4H3l9-4z" />
              <line x1="9" y1="11" x2="15" y2="17" />
              <line x1="15" y1="11" x2="9" y2="17" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Inactive Schools</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.15, marginTop: 4 }}>
              {m?.inactiveSchools ?? '—'}
            </div>
          </div>
        </div>

        {/* Draft Schools Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 2px 10px rgba(15,23,42,0.03)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#f5f3ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Draft Schools</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.15, marginTop: 4 }}>
              {m?.draftSchools ?? '—'}
            </div>
          </div>
        </div>
      </div>

      {/* School Directory Section */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          boxShadow: '0 4px 20px -4px rgba(15,23,42,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Directory Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M12 3l9 4H3l9-4z" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                School Directory
              </h2>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Manage and view all registered schools on the platform.
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#64748b',
              background: '#f8fafc',
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid #e2e8f0',
            }}
          >
            {loading ? 'Updating...' : s?.total !== undefined ? `${s.total} schools` : ''}
          </div>
        </div>

        {/* Search & Filter Area */}
        <div
          style={{
            padding: '16px 24px',
            background: '#fafbfc',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Search Field */}
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
                display: 'flex',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              id="dashboard-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search (e.g. Greenfield or SCH-00125)..."
              autoComplete="off"
              style={{
                width: '100%',
                height: 42,
                padding: '8px 14px 8px 40px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: 14,
                color: '#0f172a',
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
            />
          </div>

          {/* Status Select Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label
              htmlFor="dashboard-status"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#475569',
                whiteSpace: 'nowrap',
              }}
            >
              Status
            </label>
            <select
              id="dashboard-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                height: 42,
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: 14,
                fontWeight: 500,
                color: '#0f172a',
                outline: 'none',
                minWidth: 150,
                cursor: 'pointer',
              }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Directory Content: Desktop Table + Mobile Card Stack */}
        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
          {/* Desktop Table View */}
          <div className="desktop-table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b', width: 48, textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>School</th>
                  <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>School UUID</th>
                  <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Operators</th>
                  <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Students</th>
                  <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>Last activity</th>
                  <th style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {s?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No schools found</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>No schools match your search or filter criteria.</div>
                    </td>
                  </tr>
                ) : (
                  s?.items?.map((x: any, idx: number) => {
                    const rowNumber = (page - 1) * 10 + idx + 1;
                    const avatarColor = getAvatarColor(x.name);
                    const initials = getInitials(x.name);

                    // Semantic status badge styling
                    let badgeStyle = {
                      bg: '#f1f5f9',
                      border: '#cbd5e1',
                      text: '#475569',
                      label: 'Draft',
                    };
                    if (x.status === 'ACTIVE') {
                      badgeStyle = {
                        bg: '#ecfdf5',
                        border: '#a7f3d0',
                        text: '#047857',
                        label: 'Active',
                      };
                    } else if (x.status === 'INACTIVE') {
                      badgeStyle = {
                        bg: '#fef2f2',
                        border: '#fecaca',
                        text: '#b91c1c',
                        label: 'Inactive',
                      };
                    }

                    return (
                      <tr
                        key={x.id}
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
                        <td style={{ padding: '14px 18px', fontSize: 13, color: '#94a3b8', textAlign: 'center', fontWeight: 500 }}>
                          {rowNumber}
                        </td>

                        {/* School Name & Avatar */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: avatarColor.bg,
                                color: avatarColor.text,
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
                                href={`/admin/schools/${x.id}`}
                                style={{
                                  fontWeight: 600,
                                  fontSize: 14,
                                  color: '#0f172a',
                                  textDecoration: 'none',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#2563eb';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#0f172a';
                                }}
                              >
                                {x.name}
                              </Link>
                            </div>
                          </div>
                        </td>

                        {/* School UUID */}
                        <td style={{ padding: '14px 18px' }}>
                          <code
                            style={{
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#2563eb',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              padding: '3px 8px',
                              borderRadius: 6,
                              letterSpacing: '0.4px',
                            }}
                          >
                            {x.id}
                          </code>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '14px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: badgeStyle.bg,
                              border: `1px solid ${badgeStyle.border}`,
                              color: badgeStyle.text,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: badgeStyle.text,
                              }}
                            />
                            {badgeStyle.label}
                          </span>
                        </td>

                        {/* Operators */}
                        <td style={{ padding: '14px 18px', fontSize: 13, color: '#334155', fontWeight: 500 }}>
                          {x.operatorCount}
                        </td>

                        {/* Students */}
                        <td style={{ padding: '14px 18px', fontSize: 13, color: x.studentCountAvailability === 'AVAILABLE' ? '#0f172a' : '#94a3b8' }}>
                          {x.studentCountAvailability === 'AVAILABLE'
                            ? Number(x.studentCount).toLocaleString()
                            : 'Unavailable'}
                        </td>

                        {/* Last Activity */}
                        <td style={{ padding: '14px 18px', fontSize: 13, color: '#64748b' }}>
                          {formatLastActivity(x.lastActivityAt)}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <Link
                            href={`/admin/schools/${x.id}`}
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
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>View</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (shown only on mobile via CSS) */}
          <div className="mobile-card-stack" style={{ display: 'none', padding: '16px', gap: 12 }}>
            {s?.items?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No schools found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>No schools match your search or filter criteria.</div>
              </div>
            ) : (
              s?.items?.map((x: any) => {
                const avatarColor = getAvatarColor(x.name);
                const initials = getInitials(x.name);

                let badgeStyle = {
                  bg: '#f1f5f9',
                  border: '#cbd5e1',
                  text: '#475569',
                  label: 'Draft',
                };
                if (x.status === 'ACTIVE') {
                  badgeStyle = {
                    bg: '#ecfdf5',
                    border: '#a7f3d0',
                    text: '#047857',
                    label: 'Active',
                  };
                } else if (x.status === 'INACTIVE') {
                  badgeStyle = {
                    bg: '#fef2f2',
                    border: '#fecaca',
                    text: '#b91c1c',
                    label: 'Inactive',
                  };
                }

                return (
                  <div
                    key={x.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: avatarColor.bg,
                            color: avatarColor.text,
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
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{x.name}</div>
                          <code
                            style={{
                              fontSize: 11,
                              color: '#2563eb',
                              fontFamily: 'monospace',
                            }}
                          >
                            {x.id}
                          </code>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: badgeStyle.bg,
                          border: `1px solid ${badgeStyle.border}`,
                          color: badgeStyle.text,
                        }}
                      >
                        {badgeStyle.label}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 8,
                        background: '#f8fafc',
                        padding: 10,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <span style={{ color: '#64748b' }}>Operators: </span>
                        <strong style={{ color: '#0f172a' }}>{x.operatorCount}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Students: </span>
                        <strong style={{ color: '#0f172a' }}>
                          {x.studentCountAvailability === 'AVAILABLE' ? x.studentCount : 'Unavailable'}
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {formatLastActivity(x.lastActivityAt)}
                      </span>
                      <Link
                        href={`/admin/schools/${x.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: '#2563eb',
                          color: '#ffffff',
                          textDecoration: 'none',
                        }}
                      >
                        View School
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination Toolbar */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            background: '#fafbfc',
          }}
        >
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: '6px 14px',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: page <= 1 ? '#94a3b8' : '#334155',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            &larr; Previous
          </button>

          {/* Page numbers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {pageNumbers.map((num) => {
              const active = num === page;
              return (
                <button
                  key={num}
                  type="button"
                  disabled={loading}
                  onClick={() => setPage(num)}
                  style={{
                    minWidth: 34,
                    height: 34,
                    padding: '0 8px',
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    background: active ? '#2563eb' : '#ffffff',
                    border: `1px solid ${active ? '#2563eb' : '#cbd5e1'}`,
                    color: active ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    boxShadow: active ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
                  }}
                >
                  {num}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!s || page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              padding: '6px 14px',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: !s || page >= totalPages ? '#94a3b8' : '#334155',
              cursor: !s || page >= totalPages ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
