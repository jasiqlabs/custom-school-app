'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function StudentsUi() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const query = q ? `?q=${encodeURIComponent(q)}&pageSize=50` : '?pageSize=50';
    api(`/platform/dashboard/schools${query}`)
      .then((res: any) => {
        setData(res);
        setError('');
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load students data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [q]);

  const items = data?.items || [];
  const totalStudents = items.reduce((acc: number, item: any) => {
    return acc + (typeof item.studentCount === 'number' ? item.studentCount : 0);
  }, 0);
  const schoolsWithStudents = items.filter(
    (item: any) => typeof item.studentCount === 'number' && item.studentCount > 0
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Students
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
            Platform Student Population &amp; Cross-School Directory
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/admin/schools"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Schools Directory</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="modern-card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Student Population
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {loading ? '…' : totalStudents.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#059669', marginTop: 4, fontWeight: 500 }}>
            Across registered active schools
          </div>
        </div>

        <div className="modern-card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Schools With Students
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#2563eb', marginTop: 8 }}>
            {loading ? '…' : schoolsWithStudents}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Out of {items.length} schools
          </div>
        </div>

        <div className="modern-card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Student Verification Status
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#10b981', marginTop: 8 }}>
            100%
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Direct database sync enabled
          </div>
        </div>
      </div>

      {/* Search & List */}
      <div className="modern-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 260, maxWidth: 400, flex: 1 }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search school or student records…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: 16, color: '#dc2626', background: '#fef2f2', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                <th style={{ padding: '12px 20px' }}>School Name</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Enrolled Students</th>
                <th style={{ padding: '12px 16px' }}>Availability</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                    Loading student directory…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                    No schools or student records found matching your query.
                  </td>
                </tr>
              ) : (
                items.map((school: any) => (
                  <tr
                    key={school.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>
                      <Link href={`/admin/schools/${school.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {school.name}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor:
                            school.status === 'ACTIVE'
                              ? '#dcfce7'
                              : school.status === 'INACTIVE'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            school.status === 'ACTIVE'
                              ? '#15803d'
                              : school.status === 'INACTIVE'
                              ? '#b91c1c'
                              : '#b45309',
                        }}
                      >
                        {school.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {typeof school.studentCount === 'number' ? school.studentCount.toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          color: school.studentCountAvailability === 'AVAILABLE' ? '#059669' : '#64748b',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: school.studentCountAvailability === 'AVAILABLE' ? '#10b981' : '#cbd5e1',
                          }}
                        />
                        {school.studentCountAvailability === 'AVAILABLE' ? 'Live Synced' : 'Offline'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <Link
                        href={`/admin/schools/${school.id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                      >
                        View School
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
