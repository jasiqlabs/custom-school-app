'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function DashboardUi() {
  const [m, setM] = useState<any>();
  const [s, setS] = useState<any>();
  const [e, setE] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="container grid">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Platform Dashboard</h1>
          <p className="muted">School portfolio overview without unnecessary student PII.</p>
        </div>
        <Link href="/admin/schools/new" className="btn btn-primary">
          Add School
        </Link>
      </div>

      {e && (
        <div className="card error" role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                .then((data) => { setS(data); setE(''); })
                .catch((err) => setE(err.message))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-3">
        {[
          ['Total', m?.totalSchools],
          ['Active', m?.activeSchools],
          ['Inactive', m?.inactiveSchools],
        ].map(([k, v]) => (
          <div className="card" key={k}>
            <div className="muted">{k} Schools</div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{v ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="card grid" style={{ gap: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>School Directory</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            {loading ? 'Updating...' : s?.total !== undefined ? `${s.total} school${s.total === 1 ? '' : 's'}` : ''}
          </span>
        </div>

        {/* Real-time search & status filter: updates automatically with every keystroke and selection */}
        <div className="row" style={{ gap: 16, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1, minWidth: 260 }}>
            <label htmlFor="dashboard-q">Search name or School UUID</label>
            <input
              id="dashboard-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search (e.g. Greenfield or SCH-00125)..."
              autoComplete="off"
            />
          </div>

          <div className="field" style={{ minWidth: 180 }}>
            <label htmlFor="dashboard-status">Status</label>
            <select
              id="dashboard-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>

        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
          <table>
            <thead>
              <tr>
                <th>School</th>
                <th>School UUID</th>
                <th>Status</th>
                <th>Operators</th>
                <th>Students</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {s?.items?.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--muted)' }}>
                    No schools found matching your search criteria.
                  </td>
                </tr>
              ) : (
                s?.items?.map((x: any) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/admin/schools/${x.id}`} style={{ fontWeight: 600 }}>
                        {x.name}
                      </Link>
                    </td>
                    <td>
                      <code
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#2563eb',
                          background: '#eff6ff',
                          padding: '3px 8px',
                          borderRadius: 4,
                          letterSpacing: '0.5px',
                        }}
                      >
                        {x.id}
                      </code>
                    </td>
                    <td>
                      <span className="badge">{x.status}</span>
                    </td>
                    <td>{x.operatorCount}</td>
                    <td>
                      {x.studentCountAvailability === 'AVAILABLE'
                        ? x.studentCount
                        : 'Unavailable until Student module'}
                    </td>
                    <td>{new Date(x.lastActivityAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Fully functional interactive pagination toolbar */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
            paddingTop: 14,
            borderTop: '1px solid var(--line)',
            gap: 12,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>

          {/* Interactive page numbers */}
          <div className="row" style={{ gap: 6 }}>
            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                className={`btn ${num === page ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  minWidth: 38,
                  padding: '6px 10px',
                  fontSize: 13,
                  fontWeight: num === page ? 800 : 600,
                }}
                disabled={loading}
                onClick={() => setPage(num)}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={!s || page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
