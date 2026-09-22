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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>
      {/* Mini Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>&rsaquo;</span>
        <span style={{ fontWeight: 600, color: '#334155' }}>Dashboard</span>
      </div>

      {/* Heading & Actions */}
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
            <span>Admit New Student</span>
          </Link>
          <Link
            href="/operator/students/import"
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              padding: '9px 16px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Bulk Import</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="modern-card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Students
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
            {loading ? '…' : totalStudents.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#059669', marginTop: 4, fontWeight: 500 }}>
            Enrolled in {session?.school?.name || 'active school'}
          </div>
        </div>

        <div className="modern-card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Configured Classes
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#2563eb', marginTop: 8 }}>
            {loading ? '…' : totalClasses}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Academic grade levels
          </div>
        </div>

        <div className="modern-card" style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Sections
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#7c3aed', marginTop: 8 }}>
            {loading ? '…' : totalSections}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Across all grade levels
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div
          className="modern-card"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
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
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Student Directory</h2>
                <div style={{ fontSize: 12, color: '#64748b' }}>Search, filter, and inspect records</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
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
                fontSize: 13.5,
                textDecoration: 'none',
              }}
            >
              Open Student Directory &rarr;
            </Link>
          </div>
        </div>

        <div
          className="modern-card"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#ecfdf5',
                  color: '#059669',
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
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Student Admission Wizard</h2>
                <div style={{ fontSize: 12, color: '#64748b' }}>Individual student enrollment</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
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
                color: '#059669',
                fontWeight: 600,
                fontSize: 13.5,
                textDecoration: 'none',
              }}
            >
              Start New Admission &rarr;
            </Link>
          </div>
        </div>

        <div
          className="modern-card"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
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
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Bulk Spreadsheet Import</h2>
                <div style={{ fontSize: 12, color: '#64748b' }}>Batch XLSX onboarding</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
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
                fontSize: 13.5,
                textDecoration: 'none',
              }}
            >
              Open Bulk Import Pipeline &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Admissions Section */}
      <div className="modern-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Recent Admissions</h2>
            <div style={{ fontSize: 12, color: '#64748b' }}>Latest enrolled students in your tenant</div>
          </div>
          <Link
            href="/operator/students"
            style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
          >
            View All ({totalStudents}) &rarr;
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Loading student records…
          </div>
        ) : recentStudents.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            <p style={{ margin: '0 0 14px 0' }}>No students enrolled in this school yet.</p>
            <Link
              href="/operator/students/new"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}
            >
              Admit First Student
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                  <th style={{ padding: '12px 20px' }}>Student Code</th>
                  <th style={{ padding: '12px 16px' }}>Full Name</th>
                  <th style={{ padding: '12px 16px' }}>Class & Section</th>
                  <th style={{ padding: '12px 16px' }}>Guardian</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map((st: any) => (
                  <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 700, color: '#1e293b' }}>
                      <span
                        style={{
                          background: '#f1f5f9',
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontFamily: 'monospace',
                          fontSize: 12,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {st.studentCode}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{st.fullName}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {st.activeEnrollment ? `${st.activeEnrollment.className} - ${st.activeEnrollment.sectionName}` : 'Unassigned'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{st.fatherName || st.motherName || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className={`badge-pill ${st.status === 'ACTIVE' ? 'badge-emerald' : ''}`}
                        style={st.status !== 'ACTIVE' ? { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } : {}}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
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
