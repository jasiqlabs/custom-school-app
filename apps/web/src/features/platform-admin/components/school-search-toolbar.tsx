'use client';

import React from 'react';

interface SchoolSearchToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
}

export function SchoolSearchToolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: SchoolSearchToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
        <input
          id="school-search-input"
          type="search"
          placeholder="Search by school name, code or UUID prefix..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search schools"
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />

        <select
          id="school-status-filter"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by operational status"
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            background: '#ffffff',
            outline: 'none',
          }}
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <a
        href="/admin/schools/new"
        id="btn-onboard-school"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        + Onboard School Tenant
      </a>
    </div>
  );
}
