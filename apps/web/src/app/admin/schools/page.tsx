'use client';

import React from 'react';

export default function AdminSchoolsPage() {
  const schools = [
    {
      id: 'school-aaa-111',
      code: 'ALNOOR-01',
      name: 'Al-Noor Model Academy',
      status: 'ACTIVE',
      studentsCount: 340,
      operatorsCount: 4,
      onboardedAt: '2026-08-30',
    },
    {
      id: 'school-bbb-222',
      code: 'DPS-DELHI-02',
      name: 'Delhi Public Model School',
      status: 'ACTIVE',
      studentsCount: 520,
      operatorsCount: 6,
      onboardedAt: '2026-08-31',
    },
    {
      id: 'school-ccc-333',
      code: 'CRESCENT-03',
      name: 'Crescent English High School',
      status: 'PENDING_VERIFICATION',
      studentsCount: 0,
      operatorsCount: 1,
      onboardedAt: '2026-09-02',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: '0 0 4px 0' }}>
            Registered School Tenants
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #475569)', margin: 0 }}>
            Platform Plane Overview — MOD-000 Tenant Registry & Isolation Foundation
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--color-brand-primary-50, #eff6ff)',
              color: 'var(--color-brand-primary-700, #1d4ed8)',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Total Tenants: {schools.length}
          </span>
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated, #f8fafc)', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Tenant Code</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>School Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Students</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Operators</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Onboarded</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id} style={{ borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-brand-primary-700, #1d4ed8)' }}>
                  {school.code}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                  {school.name}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background:
                        school.status === 'ACTIVE'
                          ? 'var(--color-success-50, #f0fdf4)'
                          : 'var(--color-warning-50, #fffbeb)',
                      color:
                        school.status === 'ACTIVE'
                          ? 'var(--color-success-700, #15803d)'
                          : 'var(--color-warning-700, #b45309)',
                    }}
                  >
                    {school.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #475569)' }}>{school.studentsCount}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #475569)' }}>{school.operatorsCount}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted, #64748b)' }}>{school.onboardedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
