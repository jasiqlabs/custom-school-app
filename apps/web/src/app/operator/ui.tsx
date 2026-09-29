'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StudentSummaryWidget } from '@/features/dashboard/components/student-summary-widget';
import { FeeSummaryWidget } from '@/features/dashboard/components/fee-summary-widget';
import { TransportSummaryWidget } from '@/features/dashboard/components/transport-summary-widget';

export default function OperatorDashboardUi({ session }: { session: any }) {
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    api('/operator/students?page=1&limit=5&sortBy=recent')
      .then((st) => {
        setRecentStudents((st?.items ?? []).slice(0, 5));
      })
      .catch(() => {
        setRecentStudents([]);
      })
      .finally(() => {
        setLoadingRecent(false);
      });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Mini Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>&rsaquo;</span>
        <span style={{ fontWeight: 600, color: '#334155' }}>Dashboard</span>
      </div>

      {/* Heading & Top Navigation Actions */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              className="badge-pill badge-emerald"
              style={{ fontSize: 11, fontWeight: 700 }}
            >
              School Operator Portal
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Tenant: <strong style={{ color: '#0f172a' }}>{session?.school?.name || session?.school?.id || 'Active'}</strong>
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
            }}
          >
            {session?.school?.name || 'School Dashboard'}
          </h1>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: 14,
              color: '#64748b',
            }}
          >
            Welcome back, <strong>{session?.operator?.fullName || 'Operator'}</strong> ({session?.operator?.email}).
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link
            href="/operator/students/new"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              padding: '9px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Admit Student</span>
          </Link>

          <Link
            href="/operator/fees/collect"
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              padding: '9px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span>Collect Fee</span>
          </Link>

          <Link
            href="/operator/transports/assignments"
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              padding: '9px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <span>Transport Riders</span>
          </Link>
        </div>
      </div>

      {/* Main Canonical Widgets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* US-006-001: Student Strength & Demographics */}
        <StudentSummaryWidget />

        {/* US-006-003: Transport & Stoppage Utilization */}
        <TransportSummaryWidget />
      </div>

      {/* US-006-002: Fee Summary & Collection Analytics (Full Width) */}
      <FeeSummaryWidget />

      {/* Quick Reference: Recent Admissions */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #fafbfc, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Recent Student Admissions
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                Latest active student records added to the directory
              </p>
            </div>
          </div>

          <Link
            href="/operator/students"
            style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
          >
            View all students &rarr;
          </Link>
        </div>

        <div style={{ padding: '8px 20px 16px 20px' }}>
          {loadingRecent ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
              Loading recent admissions...
            </div>
          ) : recentStudents.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
              No admissions recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Student Code</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Full Name</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Class & Section</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700, color: '#1e293b' }}>
                        {s.studentCode}
                      </td>
                      <td style={{ padding: '10px 8px', color: '#0f172a', fontWeight: 500 }}>
                        {s.fullName}
                      </td>
                      <td style={{ padding: '10px 8px', color: '#475569' }}>
                        {s.className || 'Unassigned'} {s.sectionName ? `(${s.sectionName})` : ''}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: s.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                            color: s.status === 'ACTIVE' ? '#15803d' : '#991b1b',
                          }}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <Link
                          href={`/operator/students/${s.id}`}
                          style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
                        >
                          View Profile &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
