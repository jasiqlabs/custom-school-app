'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  fetchDashboardMetrics,
  fetchSchoolSummary,
  adminLogout,
} from '../../../features/platform-admin/api/admin-api-client';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDashboard = async (statusFilter?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [m, s] = await Promise.all([
        fetchDashboardMetrics(),
        fetchSchoolSummary({ status: statusFilter || undefined }),
      ]);
      setMetrics(m);
      setSummary(s);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load portfolio metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(selectedStatus);
  }, [selectedStatus]);

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch (err) {
      // Ignore
    }
    router.push('/admin/login');
  };

  if (isLoading && !metrics) {
    return (
      <div style={{ maxWidth: '1100px', margin: '4rem auto', textAlign: 'center', color: '#6b7280' }}>
        Loading platform dashboard...
      </div>
    );
  }

  const isZeroState = metrics && metrics.totalSchools === 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Top Navbar */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.875rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              CS
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.125rem', color: '#0f172a' }}>
              CustomSchool
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#e0e7ff',
                color: '#4338ca',
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Platform Admin
            </span>
          </div>

          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link
              href="/admin/dashboard"
              style={{
                color: '#2563eb',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/schools"
              style={{
                color: '#64748b',
                fontWeight: 500,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Schools Directory
            </Link>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/admin/schools/new"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            + Onboard School
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '0.5rem 0.875rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Platform Portfolio Overview
          </h1>
          <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Multi-tenant governance, operational health, and school infrastructure metrics.
          </p>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.875rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        {/* KPI Metric Cards */}
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Schools
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginTop: '0.375rem' }}>
                {metrics.totalSchools}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>All registered tenants</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Schools
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d', marginTop: '0.375rem' }}>
                {metrics.activeSchools}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#86efac' }}>Fully operational</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Inactive Schools
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.375rem' }}>
                {metrics.inactiveSchools}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Deactivated / Suspended</span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Draft Schools
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#b45309', marginTop: '0.375rem' }}>
                {metrics.draftSchools}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#fde68a' }}>Pending onboarding</span>
            </div>
          </div>
        )}

        {/* Zero State or Summary Table */}
        {isZeroState ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              padding: '4rem 2rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏫</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              No Schools Onboarded Yet
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
              Your platform portfolio has zero schools registered. Start by creating your first school tenant to configure branding and academic structures.
            </p>
            <Link
              href="/admin/schools/new"
              style={{
                display: 'inline-block',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              + Onboard First School Tenant
            </Link>
          </div>
        ) : (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Filter Bar */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                School Tenants ({summary?.total ?? 0})
              </h2>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { label: 'All', value: '' },
                  { label: 'Active', value: 'ACTIVE' },
                  { label: 'Inactive', value: 'INACTIVE' },
                  { label: 'Draft', value: 'DRAFT' },
                ].map((tab) => (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setSelectedStatus(tab.value)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: selectedStatus === tab.value ? '#2563eb' : '#e2e8f0',
                      backgroundColor: selectedStatus === tab.value ? '#eff6ff' : '#ffffff',
                      color: selectedStatus === tab.value ? '#2563eb' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 1.25rem' }}>School Name & UUID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Operators</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Students</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Last Activity</th>
                  <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {summary?.items?.map((s: any) => (
                  <tr key={s.schoolId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {s.schoolUuid}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor:
                            s.status === 'ACTIVE'
                              ? '#dcfce7'
                              : s.status === 'INACTIVE'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            s.status === 'ACTIVE'
                              ? '#15803d'
                              : s.status === 'INACTIVE'
                              ? '#b91c1c'
                              : '#b45309',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                      {s.operatorCount} {s.operatorCount === 1 ? 'operator' : 'operators'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                      Admissions in MOD-002
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8125rem' }}>
                      {s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                      <Link
                        href={`/admin/schools/${s.schoolId}`}
                        style={{
                          color: '#2563eb',
                          fontWeight: 500,
                          textDecoration: 'none',
                          fontSize: '0.8125rem',
                        }}
                      >
                        Manage Tenant →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
