'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fetchSchoolById, fetchClasses } from '../../../../../features/platform-admin/api/admin-api-client';
import { ClassList } from '../../../../../features/platform-admin/components/class-list';

export default function SchoolAcademicsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const resolvedParams = use(params);
  const schoolId = resolvedParams.schoolId;

  const [school, setSchool] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [schoolData, classesData] = await Promise.all([
        fetchSchoolById(schoolId),
        fetchClasses(schoolId),
      ]);
      setSchool(schoolData);
      setClasses(classesData || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load academics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
        Loading academic structure...
      </div>
    );
  }

  if (!school) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', textAlign: 'center' }}>
        <h2>School Not Found</h2>
        <Link href="/admin/schools">← Return to Schools Directory</Link>
      </div>
    );
  }

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
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              Academic Structure Configuration — Classes and Sections
            </p>
          </div>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <Link
          href={`/admin/schools/${school.id}`}
          style={{
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#4b5563',
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
            fontWeight: 600,
            color: '#2563eb',
            borderBottom: '2px solid #2563eb',
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

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Class List Component */}
      <ClassList schoolId={school.id} classes={classes} onRefresh={loadData} />
    </div>
  );
}
