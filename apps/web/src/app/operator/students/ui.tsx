'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { studentsApi, type SchoolClassWithSections } from '@/features/students/api/students-api-client';
import type { StudentDirectoryItem, StudentDirectoryResponse, StudentGender } from '@custom-school/contracts';

export function StudentDirectoryUi({ session }: { session: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<SchoolClassWithSections[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [classId, setClassId] = useState(searchParams.get('classId') || '');
  const [sectionId, setSectionId] = useState(searchParams.get('sectionId') || '');
  const [gender, setGender] = useState<StudentGender | ''>((searchParams.get('gender') as StudentGender) || '');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | ''>((searchParams.get('status') as any) || '');
  const [transport, setTransport] = useState<string>(searchParams.get('transport') || '');
  const [page, setPage] = useState<number>(Number(searchParams.get('page')) || 1);
  const [limit, setLimit] = useState<number>(Number(searchParams.get('limit')) || 25);

  const [data, setData] = useState<StudentDirectoryResponse>({
    items: [],
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load available classes on mount
  useEffect(() => {
    studentsApi.getClasses()
      .then(setClasses)
      .catch(err => console.warn('Could not load classes', err));
  }, []);

  // Fetch directory data
  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentsApi.getDirectory({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        gender: gender || undefined,
        status: status || undefined,
        transportRequired: transport === 'true' ? true : transport === 'false' ? false : undefined
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load students directory');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, classId, sectionId, gender, status, transport]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  // Available sections for chosen class
  const selectedClass = classes.find(c => c.id === classId);
  const availableSections = selectedClass?.sections || [];

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setClassId('');
    setSectionId('');
    setGender('');
    setStatus('');
    setTransport('');
    setPage(1);
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Student Directory
            </h1>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: 999,
                background: '#e0e7ff',
                color: '#3730a3'
              }}
            >
              {data.total} {data.total === 1 ? 'Student' : 'Students'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Comprehensive enrollment and student registry for {session?.school?.name || 'your school'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/operator/students/import"
            className="btn"
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: '9px 15px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Bulk Import (XLSX)
          </Link>

          <Link
            href="/operator/students/new"
            className="btn"
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: '9px 16px',
              borderRadius: 8,
              background: '#2563eb',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Admit Student
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          marginBottom: 20
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            alignItems: 'center'
          }}
        >
          {/* Search Input */}
          <div style={{ gridColumn: 'span 2', minWidth: 260 }}>
            <div style={{ position: 'relative' }}>
              <input
                id="search-input"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by code (e.g. STU-2026-0001) or name..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: 11, top: 11 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={classId}
              onChange={e => {
                setClassId(e.target.value);
                setSectionId('');
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff'
              }}
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={sectionId}
              disabled={!classId}
              onChange={e => {
                setSectionId(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: !classId ? '#f8fafc' : '#ffffff'
              }}
            >
              <option value="">All Sections</option>
              {availableSections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff'
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <select
              value={gender}
              onChange={e => {
                setGender(e.target.value as any);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff'
              }}
            >
              <option value="">All Genders</option>
              <option value="BOY">Boy</option>
              <option value="GIRL">Girl</option>
            </select>
          </div>

          {/* Transport Filter */}
          <div>
            <select
              value={transport}
              onChange={e => {
                setTransport(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff'
              }}
            >
              <option value="">All Transport</option>
              <option value="true">Transport Required</option>
              <option value="false">No Transport</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(search || classId || sectionId || gender || status || transport) && (
            <div>
              <button
                type="button"
                onClick={resetFilters}
                className="btn"
                style={{
                  fontSize: 12,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px dashed #94a3b8',
                  background: 'transparent',
                  color: '#64748b',
                  width: '100%'
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            marginBottom: 20,
            fontSize: 13
          }}
        >
          {error}
        </div>
      )}

      {/* Directory Table Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Student Code</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Student Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Class & Section</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Gender</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Transport</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Admission Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'inline-block', width: 24, height: 24, border: '2px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <div style={{ marginTop: 8, fontSize: 13 }}>Loading students...</div>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '60px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>No students found</div>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px' }}>
                      {search || classId || status
                        ? 'No students matched your search criteria.'
                        : 'Begin by admitting your first student or importing from XLSX.'}
                    </p>
                    <Link
                      href="/operator/students/new"
                      className="btn"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: '#2563eb',
                        color: '#ffffff'
                      }}
                    >
                      Admit New Student
                    </Link>
                  </td>
                </tr>
              ) : (
                data.items.map((student: StudentDirectoryItem) => {
                  const initials = student.fullName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(s => s[0].toUpperCase())
                    .join('');

                  return (
                    <tr
                      key={student.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                    >
                      {/* Code */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: 12,
                            background: '#f1f5f9',
                            color: '#0f172a',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          {student.studentCode}
                        </span>
                      </td>

                      {/* Name with avatar */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: student.gender === 'GIRL' ? '#fdf2f8' : '#eff6ff',
                              color: student.gender === 'GIRL' ? '#db2777' : '#2563eb',
                              border: student.gender === 'GIRL' ? '1px solid #fbcfe8' : '1px solid #bfdbfe',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <Link
                              href={`/operator/students/${student.id}`}
                              style={{
                                fontWeight: 600,
                                color: '#0f172a',
                                textDecoration: 'none'
                              }}
                            >
                              {student.fullName}
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* Class & Section */}
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {student.className ? (
                          <span>
                            {student.className} - <span style={{ color: '#64748b' }}>Sec {student.sectionName}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Gender */}
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {student.gender === 'BOY' ? 'Boy' : 'Girl'}
                      </td>

                      {/* Transport */}
                      <td style={{ padding: '12px 16px' }}>
                        {student.transportRequired ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: '#fef3c7',
                              color: '#92400e'
                            }}
                          >
                            Required
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>No</span>
                        )}
                      </td>

                      {/* Admission Date */}
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                        {new Date(student.admissionDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: student.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                            color: student.status === 'ACTIVE' ? '#166534' : '#991b1b'
                          }}
                        >
                          {student.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <Link
                            href={`/operator/students/${student.id}`}
                            className="btn"
                            title="View Student Profile"
                            style={{
                              fontSize: 12,
                              padding: '5px 10px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155'
                            }}
                          >
                            Profile
                          </Link>
                          <Link
                            href={`/operator/students/${student.id}/admission-form`}
                            className="btn"
                            title="Print Admission Record"
                            style={{
                              fontSize: 12,
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#64748b'
                            }}
                          >
                            🖨️
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {data.totalPages > 1 && (
          <div
            style={{
              padding: '12px 20px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13,
              color: '#64748b'
            }}
          >
            <div>
              Showing Page <strong>{data.page}</strong> of <strong>{data.totalPages}</strong> ({data.total} total items)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="btn"
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: page <= 1 ? '#f1f5f9' : '#ffffff',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                className="btn"
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: page >= data.totalPages ? '#f1f5f9' : '#ffffff',
                  cursor: page >= data.totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
