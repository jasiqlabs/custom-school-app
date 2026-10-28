'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { examinationApi } from '@/features/examination/api/examination-api-client';
import type { ExamCardContextDto, ExamContextStatus } from '@custom-school/contracts';

export default function OperatorEditExamUi({
  session,
  examContextId,
}: {
  session: any;
  examContextId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<ExamCardContextDto | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [examCode, setExamCode] = useState('');
  const [examStart, setExamStart] = useState('');
  const [examEnd, setExamEnd] = useState('');
  const [venue, setVenue] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState<ExamContextStatus>('DRAFT');
  const [version, setVersion] = useState<number>(1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadExam = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await examinationApi.getContext(examContextId);
      setExam(data);
      setTitle(data.title || '');
      setExamCode(data.examCode || '');
      setExamStart(data.examStart ? data.examStart.split('T')[0] : '');
      setExamEnd(data.examEnd ? data.examEnd.split('T')[0] : '');
      setVenue(data.venue || '');
      setInstructions(data.instructions || '');
      setStatus(data.status);
      setVersion(data.version);
    } catch (err: any) {
      setError(err.message || 'Failed to load examination context');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExam();
  }, [examContextId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Exam Title is required');
      return;
    }
    if (!examStart) {
      setError('Exam Start Date is required');
      return;
    }
    if (!examEnd) {
      setError('Exam End Date is required');
      return;
    }
    if (examEnd < examStart) {
      setError('Exam End Date cannot be earlier than Exam Start Date');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updated = await examinationApi.updateContext(examContextId, {
        version,
        title: title.trim(),
        examCode: examCode.trim() || undefined,
        examStart,
        examEnd,
        venue: venue.trim() || undefined,
        instructions: instructions.trim() || undefined,
        status,
      });

      setExam(updated);
      setVersion(updated.version);
      setSuccessMessage('Exam setup updated successfully.');
    } catch (err: any) {
      if (err.status === 409 || err.code === 'ERR_VERSION_CONFLICT') {
        setError('Another operator has updated this exam setup. Please reload the page to get the latest changes.');
      } else {
        setError(err.message || 'Failed to update examination setup');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      {/* Navigation Breadcrumb */}
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
          Back to Examinations
        </Link>

        {exam && (
          <Link
            href={`/operator/exams/${exam.id}/admit-cards`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: '#0284c7',
              textDecoration: 'none',
            }}
          >
            Go to Admit Card Issuance &rarr;
          </Link>
        )}
      </div>

      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '28px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 24, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Edit Examination Setup
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Update examination dates, venue, candidate instructions, and status.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 13 }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#166534', fontSize: 13, fontWeight: 600 }}>
            {successMessage}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13.5 }}>
            Loading exam setup details...
          </div>
        ) : !exam ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#dc2626' }}>
            Exam setup not found.
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Readonly Context Scope */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 24 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Academic Session</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>{exam.academicSessionLabel || 'Default'}</span>
              </div>
              <div style={{ width: 1, background: '#e2e8f0' }} />
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Class</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>{exam.className || 'All Classes'}</span>
              </div>
              <div style={{ width: 1, background: '#e2e8f0' }} />
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Enrolled Students</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>{exam.studentCount ?? 0}</span>
              </div>
            </div>

            {/* Exam Title & Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Exam Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Exam Code
                </label>
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                />
              </div>
            </div>

            {/* Status Selector */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Exam Lifecycle Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExamContextStatus)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, background: '#f8fafc', color: '#0f172a' }}
              >
                <option value="DRAFT">DRAFT (In preparation)</option>
                <option value="READY">READY (Open for Admit Card Issuance)</option>
                <option value="CLOSED">CLOSED (Concluded)</option>
              </select>
            </div>

            {/* Dates: Start & End */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Exam Start Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={examStart}
                  onChange={(e) => setExamStart(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Exam End Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={examEnd}
                  onChange={(e) => setExamEnd(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Examination Venue (Optional)
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
              />
            </div>

            {/* Instructions */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Candidate Instructions & Rules
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={5}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <Link
                href="/operator/exams"
                style={{
                  padding: '9px 18px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 13.5,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{
                  padding: '9px 24px',
                  borderRadius: 6,
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

