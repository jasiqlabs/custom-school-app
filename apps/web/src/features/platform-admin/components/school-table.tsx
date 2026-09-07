'use client';

import React from 'react';
import Link from 'next/link';

interface SchoolItem {
  id: string;
  schoolUuid: string;
  name: string;
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  principalName?: string | null;
  createdAt: string;
}

interface SchoolTableProps {
  schools: SchoolItem[];
  isLoading: boolean;
}

export function SchoolTable({ schools, isLoading }: SchoolTableProps) {
  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
        Loading schools directory...
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div
        id="empty-schools-state"
        style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
          No school tenants found
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
          Try clearing your search filters or onboard a new school tenant.
        </p>
        <Link
          href="/admin/schools/new"
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Onboard New School
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: '#dcfce7', text: '#15803d', label: 'Active' };
      case 'DRAFT':
        return { bg: '#fef3c7', text: '#b45309', label: 'Draft' };
      case 'INACTIVE':
        return { bg: '#fee2e2', text: '#b91c1c', label: 'Inactive' };
      default:
        return { bg: '#f3f4f6', text: '#4b5563', label: status };
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 600 }}>
          <tr>
            <th style={{ padding: '0.75rem 1rem' }}>School Name</th>
            <th style={{ padding: '0.75rem 1rem' }}>Code / UUID</th>
            <th style={{ padding: '0.75rem 1rem' }}>Status</th>
            <th style={{ padding: '0.75rem 1rem' }}>Contact</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {schools.map((s) => {
            const badge = getStatusBadge(s.status);
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '1rem', fontWeight: 500, color: '#111827' }}>
                  <Link href={`/admin/schools/${s.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                    {s.name}
                  </Link>
                </td>
                <td style={{ padding: '1rem', color: '#4b5563' }}>
                  <span style={{ fontWeight: 500 }}>{s.code}</span>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                    {s.schoolUuid}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: badge.bg,
                      color: badge.text,
                    }}
                  >
                    {badge.label}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: '#6b7280' }}>
                  {s.contactEmail || s.contactPhone || '—'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <Link
                    href={`/admin/schools/${s.id}`}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      color: '#374151',
                      textDecoration: 'none',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                    }}
                  >
                    Manage School →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
