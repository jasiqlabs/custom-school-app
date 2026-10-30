'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { examinationApi } from '@/features/examination/api/examination-api-client';
import type {
  ExamCardContextDto,
  ExamStudentClearanceDto,
  AdmitCardPreviewDto,
} from '@custom-school/contracts';

export default function OperatorAdmitCardsUi({
  session,
  examContextId,
}: {
  session: any;
  examContextId: string;
}) {
  const isReportViewer = session?.role === 'REPORT_VIEWER' || session?.operator?.role === 'REPORT_VIEWER';

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<ExamCardContextDto | null>(null);
  const [students, setStudents] = useState<ExamStudentClearanceDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLEARED' | 'BLOCKED' | 'ISSUED' | 'NOT_ISSUED'>('ALL');

  // Operation States
  const [issuingStudentId, setIssuingStudentId] = useState<string | null>(null);
  const [bulkIssuing, setBulkIssuing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal: Admit Card Preview
  const [previewStudent, setPreviewStudent] = useState<ExamStudentClearanceDto | null>(null);
  const [previewData, setPreviewData] = useState<AdmitCardPreviewDto | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Modal: Fee Dues Breakdown
  const [duesModalStudent, setDuesModalStudent] = useState<ExamStudentClearanceDto | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [examData, studentsData] = await Promise.all([
        examinationApi.getContext(examContextId),
        examinationApi.getExamStudents(examContextId),
      ]);
      setExam(examData);
      setStudents(studentsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load examination students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [examContextId]);

  // Format currency
  const formatINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

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

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.studentName.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'CLEARED') return s.isFeeCleared;
    if (statusFilter === 'BLOCKED') return !s.isFeeCleared;
    if (statusFilter === 'ISSUED') return s.issueStatus === 'COMPLETED';
    if (statusFilter === 'NOT_ISSUED') return !s.issueStatus || s.issueStatus === 'FAILED';

    return true;
  });

  // Aggregate Metrics
  const totalCount = students.length;
  const clearedCount = students.filter((s) => s.isFeeCleared).length;
  const blockedCount = students.filter((s) => !s.isFeeCleared).length;
  const issuedCount = students.filter((s) => s.issueStatus === 'COMPLETED').length;

  // Single Student Issue
  const handleIssueSingle = async (student: ExamStudentClearanceDto) => {
    if (!student.isFeeCleared) {
      setActionMessage({
        type: 'error',
        text: `Cannot issue admit card for ${student.studentName}: Student has pending fee balance of ${formatINR(student.outstandingBalance)}.`,
      });
      return;
    }

    try {
      setIssuingStudentId(student.studentId);
      setActionMessage(null);

      const res = await examinationApi.issueAdmitCards({
        examContextId,
        studentIds: [student.studentId],
      });

      const result = res.results?.[0];
      if (result && !result.success) {
        setActionMessage({
          type: 'error',
          text: result.error || 'Failed to issue admit card',
        });
      } else {
        setActionMessage({
          type: 'success',
          text: result?.status === 'COMPLETED'
            ? `Admit card PDF is ready for ${student.studentName}.`
            : `Admit card requested for ${student.studentName}. PDF is being prepared; refresh to download when ready.`,
        });
        await loadData();
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to initiate admit card issuance',
      });
    } finally {
      setIssuingStudentId(null);
    }
  };

  // Bulk Issue All Fee-Cleared Students
  const handleBulkIssue = async () => {
    const eligibleStudents = students.filter((s) => s.isFeeCleared && (!s.issueStatus || s.issueStatus === 'FAILED'));
    if (eligibleStudents.length === 0) {
      setActionMessage({
        type: 'error',
        text: 'No eligible fee-cleared students pending issuance.',
      });
      return;
    }

    try {
      setBulkIssuing(true);
      setActionMessage(null);

      let issued=0, blocked=0;
      for(let offset=0;offset<eligibleStudents.length;offset+=50){
        const subset=eligibleStudents.slice(offset,offset+50);
        const res=await examinationApi.issueAdmitCards({
          examContextId, studentIds: subset.map(s=>s.studentId),
        });
        issued+=res.issuedCount; blocked+=res.blockedCount;
        setActionMessage({type:'success',text:`Processed ${Math.min(offset+50,eligibleStudents.length)} of ${eligibleStudents.length} candidates. ${issued} queued/issued, ${blocked} blocked.`});
      }
      setActionMessage({
        type: 'success', text:`Bulk issuance accepted: ${issued} queued/issued, ${blocked} blocked. Check status for completed PDFs.`,
      });
      await loadData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to perform bulk admit card issuance',
      });
    } finally {
      setBulkIssuing(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (issueId: string) => {
    try {
      setDownloadingId(issueId);
      setActionMessage(null);
      const res = await examinationApi.getDownloadUrl(issueId);
      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      } else {
        setActionMessage({ type: 'error', text: 'PDF download URL is not yet available.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to get download URL' });
    } finally {
      setDownloadingId(null);
    }
  };

  // Retry Failed Issue
  const handleRetry = async (issueId: string) => {
    try {
      setRetryingId(issueId);
      setActionMessage(null);
      await examinationApi.retryIssue(issueId);
      setActionMessage({ type: 'success', text: 'Retry triggered successfully. Refreshing status...' });
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to retry generation' });
    } finally {
      setRetryingId(null);
    }
  };

  // Open Preview Modal
  const openPreview = async (student: ExamStudentClearanceDto) => {
    setPreviewStudent(student);
    setPreviewData(null);
    setLoadingPreview(true);
    setPreviewError(null);

    try {
      const data = await examinationApi.previewAdmitCard(examContextId, student.studentId);
      setPreviewData(data);
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to generate admit card preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '24px 16px' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Link
          href="/operator/exams"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to All Exams
        </Link>

        {exam && !isReportViewer && (
          <Link
            href={`/operator/exams/${exam.id}/edit`}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#0284c7',
              textDecoration: 'none',
            }}
          >
            Edit Exam Setup &rarr;
          </Link>
        )}
      </div>

      {/* Header Card */}
      {exam && (
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {exam.title}
                </h1>
                {exam.examCode && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
                    {exam.examCode}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: exam.status === 'READY' ? '#dcfce7' : exam.status === 'CLOSED' ? '#f1f5f9' : '#fef3c7',
                    color: exam.status === 'READY' ? '#15803d' : exam.status === 'CLOSED' ? '#475569' : '#b45309',
                  }}
                >
                  {exam.status}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#475569', marginTop: 8 }}>
                <span>🏫 Class: <strong>{exam.className || 'All Classes'}</strong></span>
                <span>📅 Academic Session: <strong>{exam.academicSessionLabel || 'Default'}</strong></span>
                <span>🗓️ Dates: <strong>{formatDate(exam.examStart)} — {formatDate(exam.examEnd)}</strong></span>
                {exam.venue && <span>📍 Venue: <strong>{exam.venue}</strong></span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={loadData}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh
              </button>

              {!isReportViewer && (
                <button
                  type="button"
                  onClick={handleBulkIssue}
                  disabled={bulkIssuing || clearedCount === 0}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: bulkIssuing || clearedCount === 0 ? 'not-allowed' : 'pointer',
                    opacity: bulkIssuing || clearedCount === 0 ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {bulkIssuing ? 'Issuing Eligible Cards...' : `Issue All Fee-Cleared (${clearedCount})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Strict Fee Clearance Rule Banner */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 20, lineHeight: 1 }}>🔒</div>
        <div style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>
          <strong>Automated Fee Clearance Verification:</strong> Admit card generation and issuance requires zero outstanding balance across all tuition, admission, examination, transport, and term fees. Any student with unpaid charges is strictly blocked until their dues are settled and cleared in the Fee Management module.
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Enrolled Students</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{totalCount}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #bbf7d0', padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Fee Cleared (Eligible)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', marginTop: 4 }}>{clearedCount}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #fecaca', padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Pending Dues (Blocked)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>{blockedCount}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Admit Cards Issued</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0369a1', marginTop: 4 }}>{issuedCount}</div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          style={{
            background: actionMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : '#fee2e2'}`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            color: actionMessage.type === 'success' ? '#166534' : '#991b1b',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Search & Status Filters */}
      <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name, student code, or roll number..."
            style={{ width: '100%', padding: '8px 12px', paddingLeft: 34, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['ALL', 'CLEARED', 'BLOCKED', 'ISSUED', 'NOT_ISSUED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: statusFilter === tab ? '#2563eb' : '#cbd5e1',
                background: statusFilter === tab ? '#eff6ff' : '#ffffff',
                color: statusFilter === tab ? '#1d4ed8' : '#475569',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tab === 'ALL'
                ? `All (${students.length})`
                : tab === 'CLEARED'
                ? `Fee Cleared (${clearedCount})`
                : tab === 'BLOCKED'
                ? `Pending Dues (${blockedCount})`
                : tab === 'ISSUED'
                ? `Issued (${issuedCount})`
                : `Not Issued (${totalCount - issuedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: 14 }}>
          Loading candidate eligibility and admit card records...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: 10, border: '1px dashed #cbd5e1', padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 13.5 }}>
          No students match the selected search or filter criteria.
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Roll / Code
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Student Name
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Class & Section
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Fee Clearance Status
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Admit Card Status
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Roll & Student Code */}
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {s.rollNumber ? `Roll #${s.rollNumber}` : '-'}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>{s.studentCode}</div>
                  </td>

                  {/* Student Name */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{s.studentName}</div>
                  </td>

                  {/* Class & Section */}
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {s.className} {s.sectionName ? `(${s.sectionName})` : ''}
                  </td>

                  {/* Fee Clearance */}
                  <td style={{ padding: '12px 16px' }}>
                    {s.isFeeCleared ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 10px',
                          borderRadius: 9999,
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                        Fee Cleared (₹0 Due)
                      </span>
                    ) : (
                      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            borderRadius: 9999,
                            background: '#fee2e2',
                            color: '#b91c1c',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
                          Blocked: Dues {formatINR(s.outstandingBalance)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDuesModalStudent(s)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#b91c1c',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                          }}
                        >
                          View dues breakdown &rarr;
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Admit Card Status */}
                  <td style={{ padding: '12px 16px' }}>
                    {s.issueStatus === 'COMPLETED' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, background: '#dcfce7', color: '#166534', fontSize: 12, fontWeight: 700 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Issued
                      </span>
                    ) : s.issueStatus === 'PROCESSING' || s.issueStatus === 'QUEUED' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, background: '#e0f2fe', color: '#0369a1', fontSize: 12, fontWeight: 600 }}>
                        Processing...
                      </span>
                    ) : s.issueStatus === 'FAILED' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 9999, background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 600 }}>
                        Failed
                      </span>
                    ) : (
                      <span style={{ padding: '3px 10px', borderRadius: 9999, background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                        Not Issued
                      </span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => openPreview(s)}
                        title="Preview Candidate Admit Card"
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Preview
                      </button>

                      {/* Issue Button */}
                      {!isReportViewer && s.issueStatus !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleIssueSingle(s)}
                          disabled={!s.isFeeCleared || issuingStudentId === s.studentId}
                          title={!s.isFeeCleared ? `Blocked: ${s.blockedReason}` : 'Issue Admit Card'}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 6,
                            border: '1px solid transparent',
                            background: !s.isFeeCleared ? '#f1f5f9' : '#0284c7',
                            color: !s.isFeeCleared ? '#94a3b8' : '#ffffff',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: !s.isFeeCleared || issuingStudentId === s.studentId ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {issuingStudentId === s.studentId ? 'Issuing...' : 'Issue Card'}
                        </button>
                      )}

                      {/* Download PDF Button */}
                      {s.issueStatus === 'COMPLETED' && s.issueId && (
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(s.issueId!)}
                          disabled={downloadingId === s.issueId}
                          title="Download Signed PDF Admit Card"
                          style={{
                            padding: '5px 12px',
                            borderRadius: 6,
                            border: '1px solid #16a34a',
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          {downloadingId === s.issueId ? 'Opening...' : 'PDF'}
                        </button>
                      )}

                      {/* Retry Button if Failed */}
                      {s.issueStatus === 'FAILED' && s.issueId && !isReportViewer && (
                        <button
                          type="button"
                          onClick={() => handleRetry(s.issueId!)}
                          disabled={retryingId === s.issueId}
                          title="Retry PDF generation"
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: '1px solid #f87171',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {retryingId === s.issueId ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: FEE DUES BREAKDOWN */}
      {duesModalStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000,
          }}
          onClick={() => setDuesModalStudent(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              maxWidth: 500,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Fee Clearance Block Reason
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Candidate: <strong>{duesModalStudent.studentName}</strong> ({duesModalStudent.studentCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDuesModalStudent(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>
                Total Outstanding Balance: {formatINR(duesModalStudent.outstandingBalance)}
              </div>
              <div style={{ fontSize: 12, color: '#b91c1c' }}>
                {duesModalStudent.blockedReason || 'Pending dues must be fully cleared before an admit card can be issued.'}
              </div>
            </div>

            {duesModalStudent.unpaidItems && duesModalStudent.unpaidItems.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                  Unpaid Fee Heads
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Fee Category</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Period / Month</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duesModalStudent.unpaidItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{item.categoryName}</td>
                          <td style={{ padding: '8px 12px', color: '#64748b' }}>{item.feeMonth || '-'}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                            {formatINR(item.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <Link
                href="/operator/fees/collect"
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Go to Fee Collection &rarr;
              </Link>
              <button
                type="button"
                onClick={() => setDuesModalStudent(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADMIT CARD PREVIEW */}
      {previewStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000,
          }}
          onClick={() => setPreviewStudent(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              maxWidth: 680,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Official Admit Card Preview
              </h3>
              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            {loadingPreview ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                Generating admit card preview...
              </div>
            ) : previewError ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '16px', color: '#991b1b', fontSize: 13 }}>
                {previewError}
              </div>
            ) : previewData ? (
              <div>
                {/* Admit Card Canvas */}
                <div style={{ border: '2px solid #0f172a', borderRadius: 8, padding: 24, background: '#fafaf9', position: 'relative' }}>
                  {/* Top School Header */}
                  <div style={{ textAlign: 'center', borderBottom: '1.5px solid #0f172a', paddingBottom: 14, marginBottom: 14 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {previewData.school.name}
                    </h2>
                    {previewData.school.address && (
                      <div style={{ fontSize: 11.5, color: '#475569', marginBottom: 2 }}>
                        {previewData.school.address}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'center', gap: 12 }}>
                      {previewData.school.affiliationNumber && <span>Affiliation: {previewData.school.affiliationNumber}</span>}
                      {previewData.school.udiseNumber && <span>UDISE: {previewData.school.udiseNumber}</span>}
                    </div>
                  </div>

                  {/* Title & Badge */}
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', background: '#0f172a', padding: '4px 14px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      EXAMINATION ADMIT CARD
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginTop: 8 }}>
                      {previewData.exam.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>
                      Session: {previewData.exam.academicSessionLabel} &bull; Class: {previewData.exam.className}
                    </div>
                  </div>

                  {/* Candidate Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '12px 14px', marginBottom: 16, fontSize: 12.5 }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Candidate Name:</span>{' '}
                      <strong style={{ color: '#0f172a' }}>{previewData.student.fullName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Student Code:</span>{' '}
                      <strong style={{ color: '#0f172a' }}>{previewData.student.studentCode}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Class & Section:</span>{' '}
                      <strong style={{ color: '#0f172a' }}>{previewData.student.className} - {previewData.student.sectionName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Date of Birth:</span>{' '}
                      <strong style={{ color: '#0f172a' }}>{previewData.student.dob ? formatDate(previewData.student.dob) : '-'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Father's Name:</span>{' '}
                      <strong style={{ color: '#0f172a' }}>{previewData.student.fatherName || '-'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Mother's Name:</span>{' '}
                      <strong style={{ color: '#0f172a' }}>{previewData.student.motherName || '-'}</strong>
                    </div>
                  </div>

                  {/* Schedule & Venue */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Exam Schedule: </span>
                      <strong>{formatDate(previewData.exam.examStart)} — {formatDate(previewData.exam.examEnd)}</strong>
                    </div>
                    {previewData.exam.venue && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ color: '#64748b' }}>Venue: </span>
                        <strong>{previewData.exam.venue}</strong>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  {previewData.exam.instructions && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>
                        Important Instructions for Candidate:
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4, whiteSpace: 'pre-line', background: '#f8fafc', padding: 8, borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        {previewData.exam.instructions}
                      </div>
                    </div>
                  )}

                  {/* Signatures */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 24, marginTop: 16, borderTop: '1px dashed #cbd5e1' }}>
                    <div style={{ textAlign: 'center', width: 160 }}>
                      <div style={{ borderBottom: '1px solid #0f172a', marginBottom: 4, height: 24 }} />
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Candidate's Signature</div>
                    </div>
                    <div style={{ textAlign: 'center', width: 160 }}>
                      <div style={{ borderBottom: '1px solid #0f172a', marginBottom: 4, height: 24 }}>
                        {previewData.school.hasSignature && (
                          <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>[Certified / Signed]</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Principal / Controller of Exam</div>
                    </div>
                  </div>
                </div>

                {/* Clearance Status Callout */}
                <div style={{ marginTop: 20 }}>
                  {previewData.clearance.isFeeCleared ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
                        ✓ Fee clearance verified. Student is fully eligible for admit card issuance.
                      </div>
                      {!isReportViewer && previewStudent.issueStatus !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await handleIssueSingle(previewStudent);
                            setPreviewStudent(null);
                          }}
                          className="btn btn-primary"
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            background: '#16a34a',
                            color: '#ffffff',
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Issue Admit Card Now
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 700 }}>
                        ✕ Blocked from Issuance: Pending fee dues of {formatINR(previewData.clearance.outstandingBalance)}
                      </div>
                      <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>
                        {previewData.clearance.blockedReason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

