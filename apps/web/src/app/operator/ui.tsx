'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function OperatorDashboardUi({ session }: { session: any }) {
  const [studentsData, setStudentsData] = useState<any>(null);
  const [classesData, setClassesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/operator/students?page=1&pageSize=5').catch(() => ({ items: [], total: 0 })),
      api('/operator/students/classes').catch(() => []),
    ]).then(([st, cl]) => {
      setStudentsData(st);
      setClassesData(Array.isArray(cl) ? cl : []);
      setLoading(false);
    });
  }, []);

  const totalStudents = studentsData?.total ?? 0;
  const recentStudents = studentsData?.items ?? [];
  const totalClasses = classesData.length;
  const totalSections = classesData.reduce((acc, c) => acc + (c.sections?.length || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Banner / Welcome */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: '#10b981',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: 999,
              }}
            >
              School Operator Portal
            </span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              Tenant: <strong>{session?.school?.id || 'Active'}</strong>
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {session?.school?.name || 'School Dashboard'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
            Welcome back, <strong>{session?.operator?.fullName || 'Operator'}</strong> ({session?.operator?.email}).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/operator/students/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#2563eb',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Admit New Student
          </Link>
          <Link
            href="/operator/students/import"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Bulk Import
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Active Students</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
              {loading ? '…' : totalStudents}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Configured Classes</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
              {loading ? '…' : totalClasses}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: '#faf5ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Active Sections</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>
              {loading ? '…' : totalSections}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Student Registry</h2>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
              Browse the complete authoritative student registry. Filter by grade or section, search by name or code, and inspect comprehensive profiles with encrypted private vaults.
            </p>
          </div>
          <div style={{ marginTop: 20 }}>
            <Link
              href="/operator/students"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#2563eb',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Open Student Directory &rarr;
            </Link>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Student Admission Wizard</h2>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
              Register new students with automated sequential identifier generation, Aadhaar Verhoeff validation, private PII encryption, emergency contacts, and academic section enrollment.
            </p>
          </div>
          <div style={{ marginTop: 20 }}>
            <Link
              href="/operator/students/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#16a34a',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Start New Admission &rarr;
            </Link>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#fff7ed',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Bulk Spreadsheet Import</h2>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
              Upload Excel (.xlsx) workbooks for batch student onboarding. Preview and validate rows with clear error feedback before committing admissions to the database.
            </p>
          </div>
          <div style={{ marginTop: 20 }}>
            <Link
              href="/operator/students/import"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#ea580c',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Open Bulk Import Pipeline &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Admissions Section */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: 24,
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Recent Admissions</h2>
          <Link
            href="/operator/students"
            style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
          >
            View All ({totalStudents}) &rarr;
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            Loading student records…
          </div>
        ) : recentStudents.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            <p style={{ margin: '0 0 12px 0' }}>No students enrolled in this school yet.</p>
            <Link
              href="/operator/students/new"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              Admit First Student
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Student Code</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Full Name</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Class & Section</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Guardian</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map((st: any) => (
                  <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#1e293b' }}>
                      <span
                        style={{
                          background: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontFamily: 'monospace',
                          fontSize: 13,
                        }}
                      >
                        {st.studentCode}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>{st.fullName}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>
                      {st.activeEnrollment ? `${st.activeEnrollment.className} - ${st.activeEnrollment.sectionName}` : 'Unassigned'}
                    </td>
                    <td style={{ padding: '12px', color: '#475569' }}>{st.fatherName || st.motherName || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          background: st.status === 'ACTIVE' ? '#ecfdf5' : '#fef2f2',
                          color: st.status === 'ACTIVE' ? '#047857' : '#991b1b',
                        }}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <Link
                        href={`/operator/students/${st.id}`}
                        style={{
                          color: '#2563eb',
                          fontWeight: 600,
                          fontSize: 13,
                          textDecoration: 'none',
                        }}
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
  );
}
