'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { examinationApi } from '@/features/examination/api/examination-api-client';
import { academicSessionsApi } from '@/features/academics/api/academic-sessions-api-client';
import { api } from '@/lib/api';
import type { AcademicSessionDto } from '@custom-school/contracts';

interface ClassOption {
  id: string;
  name: string;
}

export default function OperatorNewExamUi({ session }: { session: any }) {
  const router = useRouter();

  const [sessions, setSessions] = useState<AcademicSessionDto[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form State
  const [academicSessionId, setAcademicSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [examCode, setExamCode] = useState('');
  const [examStart, setExamStart] = useState('');
  const [examEnd, setExamEnd] = useState('');
  const [venue, setVenue] = useState('');
  const [instructions, setInstructions] = useState(
    '1. Students must carry their Admit Card and School Identity Card to the examination hall.\n2. Electronic items, mobile phones, smartwatches, and study materials are strictly prohibited inside the hall.\n3. Report to the examination room at least 20 minutes prior to the commencement of the exam.\n4. No candidate will be permitted to enter the hall after the commencement of the exam without prior permission.'
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        setLoadingOptions(true);
        const [sessData, clsData] = await Promise.all([
          academicSessionsApi.list('/operator/academic-sessions'),
          api<ClassOption[]>('/operator/students/classes').catch(() => []),
        ]);
        setSessions(sessData);
        setClasses(clsData || []);

        // Default to active session if available
        const active = sessData.find((s) => s.status === 'ACTIVE');
        if (active) {
          setAcademicSessionId(active.id);
        } else if (sessData.length > 0) {
          setAcademicSessionId(sessData[0].id);
        }

        if (clsData && clsData.length > 0) {
          setClassId(clsData[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load configuration options');
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicSessionId) {
      setError('Please select an Academic Session');
      return;
    }
    if (!classId) {
      setError('Please select a Class');
      return;
    }
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
      setSubmitting(true);
      setError(null);
      const created = await examinationApi.createContext({
        academicSessionId,
        classId,
        title: title.trim(),
        examCode: examCode.trim() || undefined,
        examStart,
        examEnd,
        venue: venue.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });

      router.push(`/operator/exams/${created.id}/admit-cards`);
    } catch (err: any) {
      setError(err.message || 'Failed to create examination context');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
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
      </div>

      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '28px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: 24, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            New Examination Setup
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Configure an examination schedule for a target class and session before issuing student admit cards.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 13 }}>
            {error}
          </div>
        )}

        {loadingOptions ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13.5 }}>
            Loading academic sessions and classes...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Target Scope: Session and Class */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Academic Session <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={academicSessionId}
                  onChange={(e) => setAcademicSessionId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, background: '#f8fafc', color: '#0f172a' }}
                >
                  <option value="">Select Academic Session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.code}) {s.status === 'ACTIVE' ? '★ Active' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Target Class <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5, background: '#f8fafc', color: '#0f172a' }}
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exam Title & Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Exam Title / Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Final Examination 2026"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Exam Code (Optional)
                </label>
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  placeholder="e.g. FINAL-2026"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
                />
              </div>
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
                placeholder="e.g. School Examination Hall / Main Campus Block B"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
              />
            </div>

            {/* Instructions */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                Candidate Instructions & Rules (Printed on Admit Cards)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={5}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
              />
              <span style={{ fontSize: 12, color: '#64748b' }}>
                These instructions will be formatted and printed directly onto the candidate admit cards.
              </span>
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
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  padding: '9px 24px',
                  borderRadius: 6,
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Creating Exam Setup...' : 'Create Exam Setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

