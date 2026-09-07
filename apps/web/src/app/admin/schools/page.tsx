'use client';

import React, { useState, useEffect } from 'react';
import { SchoolSearchToolbar } from '../../../features/platform-admin/components/school-search-toolbar';
import { SchoolTable } from '../../../features/platform-admin/components/school-table';
import { fetchSchools } from '../../../features/platform-admin/api/admin-api-client';

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSchools = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchSchools({
        search: searchTerm,
        status: statusFilter,
      });
      setSchools(data.items || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load schools');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSchools();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }}>
          School Tenants Directory
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
          Govern, onboard and configure multi-tenant schools across the platform.
        </p>
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

      <SchoolSearchToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <SchoolTable schools={schools} isLoading={isLoading} />
    </div>
  );
}
