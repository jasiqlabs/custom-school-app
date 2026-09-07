'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fetchSchoolById } from '../../../../features/platform-admin/api/admin-api-client';
import { SchoolProfileForm } from '../../../../features/platform-admin/components/school-profile-form';
import { PrincipalForm } from '../../../../features/platform-admin/components/principal-form';
import { SchoolStatusBanner } from '../../../../features/platform-admin/components/school-status-banner';

export default function SchoolDetailPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const resolvedParams = use(params);
  const schoolId = resolvedParams.schoolId;

  const [school, setSchool] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSchool = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchSchoolById(schoolId);
      setSchool(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'School not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchool();
  }, [schoolId]);

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
        Loading school details...
      </div>
    );
  }

  if (!school) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#111827' }}>School Not Found</h2>
        <p style={{ color: '#6b7280' }}>{errorMessage || 'The requested school tenant could not be found.'}</p>
        <Link href="/admin/schools" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
          ← Return to Schools Directory
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

  const badge = getStatusBadge(school.status);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/schools" style={{ color: '#2563eb', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← Back to Schools Directory
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              {school.name}
            </h1>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <span>Code: <strong style={{ color: '#374151' }}>{school.code}</strong></span>
              <span>•</span>
              <span>Immutable UUID: <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{school.schoolUuid}</code></span>
            </div>
          </div>
          <span
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: badge.bg,
              color: badge.text,
            }}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* School Status Banner */}
      <SchoolStatusBanner school={school} onUpdated={(updated) => setSchool(updated)} />

      {/* Sub-navigation tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <Link
          href={`/admin/schools/${school.id}`}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#2563eb',
            borderBottom: '2px solid #2563eb',
            textDecoration: 'none',
          }}
        >
          Overview & Profile
        </Link>
        <Link
          href={`/admin/schools/${school.id}/academics`}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#4b5563',
            textDecoration: 'none',
          }}
        >
          Classes & Sections
        </Link>
        <Link
          href={`/admin/schools/${school.id}/operators`}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#4b5563',
            textDecoration: 'none',
          }}
        >
          School Operators
        </Link>
        <Link
          href={`/admin/schools/${school.id}/transfer-certificate`}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#4b5563',
            textDecoration: 'none',
          }}
        >
          Transfer Certificate
        </Link>
      </div>

      {/* Profile Form */}
      <SchoolProfileForm school={school} onUpdated={(updated) => setSchool(updated)} />

      {/* Principal Form */}
      <PrincipalForm school={school} onUpdated={(updated) => setSchool(updated)} />
    </div>
  );
}
