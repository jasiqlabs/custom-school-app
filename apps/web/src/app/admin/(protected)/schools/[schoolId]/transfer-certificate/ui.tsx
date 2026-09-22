'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SchoolNav } from '@/components/school-nav';
import { SchoolHeader } from '@/components/school-header';

export default function TcUi({ schoolId }: { schoolId: string }) {
  const [school, setSchool] = useState<any>();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>();
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  async function load() {
    try {
      const [s, h] = await Promise.all([
        api(`/platform/schools/${schoolId}`),
        api<any>(`/platform/schools/${schoolId}/transfer-certificates`),
      ]);
      setSchool(s);
      setRows(h.items || []);

      if (s?.logoFileId) {
        api<{ url: string }>(`/platform/schools/${schoolId}/logo`)
          .then((res) => {
            if (res?.url) setLogoUrl(res.url);
          })
          .catch(() => {
            setLogoUrl(
              `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'}/platform/schools/${schoolId}/logo/view?t=${Date.now()}`
            );
          });
      }
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [schoolId]);

  // Non-blocking auto-refresh when there are queued or processing certificates
  useEffect(() => {
    const hasActive = rows.some((r) => r.status === 'QUEUED' || r.status === 'PROCESSING');
    if (!hasActive) return;

    const timer = setTimeout(() => {
      load();
    }, 1000);

    return () => clearTimeout(timer);
  }, [rows, schoolId]);

  async function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    setIsSearching(true);
    const q = String(new FormData(e.currentTarget).get('q') || '');
    try {
      const res = await api<any[]>(
        `/platform/schools/${schoolId}/students/search?q=${encodeURIComponent(q)}`
      );
      setResults(res || []);
    } catch (e: any) {
      setErr(
        e.code === 'ERR_STUDENT_CAPABILITY_UNAVAILABLE'
          ? 'Student search will become live when MOD-003 Student Management is implemented. The TC contract itself is already production-wired and fails closed until then.'
          : e.message
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function issue() {
    if (!selected || isGenerating) return;
    setIsGenerating(true);
    setErr('');
    setMsg('');

    try {
      const tc = await api<any>(`/platform/schools/${schoolId}/transfer-certificates`, {
        method: 'POST',
        body: JSON.stringify({ studentId: selected.id, templateVersion: 'standard-v1' }),
      });
      setMsg(`TC accepted successfully. UUID: ${tc.tcUuid}`);
      setTimeout(() => setMsg(''), 6000);
      setRows((prev) => [
        {
          id: tc.id,
          tcUuid: tc.tcUuid,
          studentCode: selected.studentCode,
          studentName: selected.name,
          className: selected.className,
          sectionName: selected.sectionName,
          issuedAt: tc.issuedAt || new Date().toISOString(),
          status: 'QUEUED',
        },
        ...prev.filter((r) => r.id !== tc.id),
      ]);
      setSelected(undefined);
      setResults([]);
      await load();
    } catch (e: any) {
      setErr(e.message || 'Failed to generate TC');
    } finally {
      setIsGenerating(false);
    }
  }

  async function download(id: string) {
    try {
      const x = await api<any>(`/platform/schools/${schoolId}/transfer-certificates/${id}/download`);
      window.open(x.url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function retry(id: string) {
    try {
      await api(`/platform/schools/${schoolId}/transfer-certificates/${id}/retry-render`, {
        method: 'POST',
      });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  // Readiness checklist items
  const isProfileComplete = school?.status === 'ACTIVE' && !!school?.name;
  const hasLogo = !!school?.logoFileId;
  const hasPrincipal = !!school?.principal?.name;
  const hasSignature = !!school?.principal?.signatureFileId;
  const ready = isProfileComplete && hasLogo && hasPrincipal && hasSignature;

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      {/* Reusable School Header */}
      <SchoolHeader
        school={school}
        schoolId={schoolId}
        logoUrl={logoUrl}
        onStatusChange={() => load()}
      />

      {/* Reusable School Tabs */}
      <SchoolNav schoolId={schoolId} />

      {/* Global Alerts */}
      {err && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#991b1b',
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{err}</span>
          <button
            type="button"
            onClick={() => setErr('')}
            style={{
              background: '#ffffff',
              border: '1px solid #fecaca',
              padding: '3px 10px',
              borderRadius: 5,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}
      {msg && (
        <div
          role="status"
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#065f46',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 20,
          }}
        >
          ✓ {msg}
        </div>
      )}

      {/* ========================================================= */}
      {/* CARD 1: Top Overview & Readiness Checklist                */}
      {/* ========================================================= */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        {/* Left: Title & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Transfer Certificates
            </h2>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
              Generate and manage transfer certificates for students.
            </div>
          </div>
        </div>

        {/* Right: Readiness Box matching reference 5 */}
        <div
          style={{
            background: ready ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${ready ? '#bbf7d0' : '#fde68a'}`,
            borderRadius: 10,
            padding: '14px 18px',
            minWidth: 260,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: ready ? '#15803d' : '#b45309',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {ready ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Ready to issue certificates</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Action needed to issue certificates</span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: isProfileComplete && hasLogo ? '#166534' : '#9a3412',
              }}
            >
              <span>{isProfileComplete && hasLogo ? '✓' : '•'}</span>
              <span>School profile & logo complete</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: hasPrincipal ? '#166534' : '#9a3412',
              }}
            >
              <span>{hasPrincipal ? '✓' : '•'}</span>
              <span>Principal details available</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: hasSignature ? '#166534' : '#9a3412',
              }}
            >
              <span>{hasSignature ? '✓' : '•'}</span>
              <span>Principal signature uploaded</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CARD 2: Find Student                                      */}
      {/* ========================================================= */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          marginBottom: 24,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Find Student
          </h3>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Search and select a student to generate transfer certificate.
          </div>
        </div>

        <form
          onSubmit={search}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                display: 'inline-flex',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              name="q"
              required
              placeholder="Search by student name, admission no. or SR no..."
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                background: '#ffffff',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSearching}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>{isSearching ? 'Searching…' : 'Search'}</span>
          </button>
        </form>

        {/* Student Search Results */}
        {results.length > 0 && (
          <div style={{ marginTop: 20, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
              Matching Students ({results.length}):
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {results.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: selected?.id === s.id ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${selected?.id === s.id ? '#93c5fd' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2563eb',
                        background: '#ffffff',
                        border: '1px solid #bfdbfe',
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {s.studentCode}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{s.name}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}>
                      ({s.className} / {s.sectionName})
                    </span>
                  </div>

                  <button
                    type="button"
                    className={selected?.id === s.id ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ fontSize: 12, padding: '5px 14px' }}
                    onClick={() => setSelected(s)}
                  >
                    {selected?.id === s.id ? 'Selected' : 'Select for TC'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Student Issuance Preview Card */}
        {selected && (
          <div
            style={{
              marginTop: 20,
              padding: '18px 20px',
              borderRadius: 10,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                Issue Transfer Certificate for: {selected.name}
              </div>
              <button
                type="button"
                onClick={() => setSelected(undefined)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12 }}
              >
                ✕ Cancel
              </button>
            </div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.4 }}>
              Student ID: <strong>{selected.studentCode}</strong> | Class:{' '}
              <strong>
                {selected.className} / {selected.sectionName}
              </strong>
              <br />
              Issuing generates an immutable TC record and freezes school, principal, and student snapshots.
            </div>

            <button
              type="button"
              disabled={!ready || isGenerating}
              className="btn btn-primary"
              onClick={issue}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 20px',
                fontSize: 13,
                fontWeight: 600,
                opacity: !ready ? 0.6 : 1,
                cursor: !ready || isGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {isGenerating ? 'Generating…' : 'Generate New TC'}
            </button>
            {!ready && (
              <span style={{ fontSize: 12, color: '#b91c1c', marginLeft: 12 }}>
                School must be ACTIVE with logo, principal name and signature to issue TC.
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* CARD 3: Issued Certificates History                       */}
      {/* ========================================================= */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Issued Certificates
            </h3>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              History of generated transfer certificates.
            </div>
          </div>

          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            {rows.length} {rows.length === 1 ? 'record' : 'records'}
          </div>
        </div>

        {rows.length === 0 ? (
          /* Empty State matching reference 5 */
          <div
            style={{
              padding: '56px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: 10,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
              No transfer certificates yet
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
              Certificates issued for students will appear here.
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Find a student above to issue the first certificate.
            </div>
          </div>
        ) : (
          /* Table of Issued TCs */
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    Certificate No.
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    Student Name
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    Class
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    Issued On
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isCompleted = r.status === 'COMPLETED';
                  const isFailed = r.status === 'FAILED';
                  const isPending = r.status === 'QUEUED' || r.status === 'PROCESSING';

                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#2563eb',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          {r.tcUuid}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                        {r.studentName}
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                          ID: {r.studentCode}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        {r.className}/{r.sectionName}
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>
                        {new Date(r.issuedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 9999,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isCompleted
                              ? '#ecfdf5'
                              : isFailed
                              ? '#fef2f2'
                              : '#eff6ff',
                            color: isCompleted
                              ? '#047857'
                              : isFailed
                              ? '#b91c1c'
                              : '#1d4ed8',
                            border: `1px solid ${
                              isCompleted
                                ? '#a7f3d0'
                                : isFailed
                                ? '#fecaca'
                                : '#bfdbfe'
                            }`,
                          }}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => download(r.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>Download / Print</span>
                          </button>
                        ) : isFailed ? (
                          <button
                            type="button"
                            onClick={() => retry(r.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              cursor: 'pointer',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1 4 1 10 7 10" />
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                            <span>Retry render</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#64748b' }}>Waiting…</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
