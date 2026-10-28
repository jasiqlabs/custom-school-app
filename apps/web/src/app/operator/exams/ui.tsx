'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { examinationApi } from '@/features/examination/api/examination-api-client';
import { academicSessionsApi } from '@/features/academics/api/academic-sessions-api-client';
import { api } from '@/lib/api';
import type { ExamCardContextDto, AcademicSessionDto } from '@custom-school/contracts';

interface ClassOption {
  id: string;
  name: string;
}

export default function OperatorExamsUi({ session }: { session: any }) {
  const isReportViewer = session?.role === 'REPORT_VIEWER' || session?.operator?.role === 'REPORT_VIEWER';

  const [exams, setExams] = useState<ExamCardContextDto[]>([]);
  const [sessions, setSessions] = useState<AcademicSessionDto[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const loadFilterOptions = async () => {
    try {
      const [sessionsData, classesData] = await Promise.all([
        academicSessionsApi.list('/operator/academic-sessions'),
        api<ClassOption[]>('/operator/students/classes').catch(() => []),
      ]);
      setSessions(sessionsData);
      setClasses(classesData || []);
    } catch {
      // ignore filter load errors
    }
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await examinationApi.listContexts({
        academicSessionId: selectedSessionId || undefined,
        classId: selectedClassId || undefined,
        status: selectedStatus || undefined,
      });
      setExams(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load examination setups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadExams();
  }, [selectedSessionId, selectedClassId, selectedStatus]);

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            READY
          </span>
        );
      case 'CLOSED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 600 }}>
            CLOSED
          </span>
        );
      case 'DRAFT':
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: '#fef3c7', color: '#b45309', fontSize: 12, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
            DRAFT
          </span>
        );
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Banner / Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
                <path d="M9 11h2" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Examinations & Admit Cards
              </h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                Configure exam schedules and issue official student admit cards with strict automated fee clearance verification.
              </p>
            </div>
          </div>
        </div>

        {!isReportViewer && (
          <Link
            href="/operator/exams/new"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13.5,
              fontWeight: 600,
              padding: '10px 18px',
              borderRadius: 8,
              background: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Exam Setup
          </Link>
        )}
      </div>

      {/* Info Notice about Strict Fee Clearance Rule */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 20, lineHeight: 1 }}>🛡️</div>
        <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
          <strong>Fee Clearance Policy Notice:</strong> Per school governance rules, students with any outstanding fee dues, arrears, or unpaid charges are strictly blocked from admit card generation. Students with full fee clearance can receive their admit cards immediately.
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Academic Session:
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc', color: '#1e293b' }}
          >
            <option value="">All Academic Years</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.code}) {s.status === 'ACTIVE' ? '★ Active' : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180, flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Class:
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc', color: '#1e293b' }}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Status:
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc', color: '#1e293b' }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="READY">READY</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        {(selectedSessionId || selectedClassId || selectedStatus) && (
          <button
            type="button"
            onClick={() => {
              setSelectedSessionId('');
              setSelectedClassId('');
              setSelectedStatus('');
            }}
            style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Exams Grid / Directory */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: 14 }}>
          Loading examination setups...
        </div>
      ) : exams.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px dashed #cbd5e1', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 16px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>No Examination Setups Found</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            {selectedSessionId || selectedClassId || selectedStatus
              ? 'No exams match the selected filter criteria. Try adjusting or clearing your filters.'
              : 'Get started by creating your first exam context for a class and session.'}
          </p>
          {!isReportViewer && (
            <Link
              href="/operator/exams/new"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                padding: '9px 16px',
                borderRadius: 8,
                background: '#2563eb',
                color: '#ffffff',
                textDecoration: 'none',
              }}
            >
              + Create First Exam Setup
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
          {exams.map((exam) => (
            <div
              key={exam.id}
              style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Card Header: Title & Status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.3 }}>
                      {exam.title}
                    </h3>
                    {exam.examCode && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em' }}>
                        CODE: {exam.examCode}
                      </span>
                    )}
                  </div>
                  <div>{renderStatusBadge(exam.status)}</div>
                </div>

                {/* Metadata Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span>🏫</span>
                    <span>Class: <strong>{exam.className || 'All Classes'}</strong></span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span>📅</span>
                    <span>Session: <strong>{exam.academicSessionLabel || 'Default'}</strong></span>
                  </div>
                </div>

                {/* Dates & Venue */}
                <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Exam Dates: </span>
                    <strong style={{ color: '#1e293b' }}>
                      {formatDate(exam.examStart)} — {formatDate(exam.examEnd)}
                    </strong>
                  </div>
                  {exam.venue && (
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Venue: </span>
                      <span style={{ color: '#1e293b' }}>{exam.venue}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{exam.studentCount ?? 0}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Enrolled</div>
                  </div>
                  <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{exam.issuedCount ?? 0}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Admit Cards Issued</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <Link
                  href={`/operator/exams/${exam.id}/admit-cards`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: 12.5,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Issue Admit Cards
                </Link>

                {!isReportViewer && (
                  <Link
                    href={`/operator/exams/${exam.id}/edit`}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      fontSize: 12.5,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

