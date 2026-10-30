'use client';

import { useEffect, useState } from 'react';
import { studentsApi, type SchoolClassWithSections } from '../api/students-api-client';
import { academicSessionsApi } from '@/features/academics/api/academic-sessions-api-client';

type Mode = 'exit' | 'readmit' | null;

export function StudentLifecycleActions({
  studentId, active, classes, onChanged,
}: {
  studentId: string;
  active: boolean;
  classes: SchoolClassWithSections[];
  onChanged: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Left school');
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const chosenClass = classes.find(c => c.id === classId);
  useEffect(() => {
    if (mode !== 'readmit') return;
    let mounted = true;
    academicSessionsApi.getCurrent().then(session => {
      if (mounted) setSessionId(session?.status === 'ACTIVE' ? session.id : '');
    }).catch(() => { if (mounted) setError('Unable to load active year'); });
    return () => { mounted = false; };
  }, [mode]);
  const chooseMode = (next: Mode) => {
    setMode(next); setError('');
    const first = classes[0];
    setClassId(first?.id || '');
    setSectionId(first?.sections[0]?.id || '');
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!mode || busy) return;
    setBusy(true); setError('');
    try {
      if (mode === 'exit') {
        if (reason.trim().length < 3) throw new Error('Please enter a reason');
        await studentsApi.exitStudent(studentId, { effectiveDate, reason: reason.trim() });
      } else {
        if (!sessionId || !classId || !sectionId) throw new Error('Select an active year, class and section');
        await studentsApi.readmitStudent(studentId, { effectiveDate, academicSessionId: sessionId, classId, sectionId });
      }
      setMode(null);
      await onChanged();
    } catch (err: any) {
      setError(err?.message || 'Unable to complete student lifecycle update');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-secondary"
        onClick={() => chooseMode(active ? 'exit' : 'readmit')}>
        {active ? 'Leave / Pass-out' : 'Re-admit to Active Year'}
      </button>
      {mode && (
        <form onSubmit={submit} aria-label="Student lifecycle change"
          style={{ width: '100%', maxWidth: 420, display: 'grid', gap: 10, padding: 12,
            border: '1px solid #cbd5e1', borderRadius: 10, background: '#f8fafc' }}>
          <strong>{mode === 'exit' ? 'Confirm student leaving' : 'Re-admit existing student'}</strong>
          <label>Effective date
            <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} required/>
          </label>
          {mode === 'exit' ? (
            <label>Reason
              <textarea value={reason} onChange={e => setReason(e.target.value)}
                minLength={3} maxLength={500} required rows={2}/>
            </label>
          ) : (
            <>
              <div>Active academic year: {sessionId ? 'Selected' : 'Not configured'}</div>
              <label>Class
                <select value={classId} onChange={e => {
                  setClassId(e.target.value);
                  setSectionId(classes.find(c => c.id === e.target.value)?.sections[0]?.id || '');
                }} required>
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>Section
                <select value={sectionId} onChange={e => setSectionId(e.target.value)} required>
                  <option value="">Select section</option>
                  {chosenClass?.sections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                </select>
              </label>
              <small>Previous fees and enrollment history will remain unchanged. Transport is not automatically restarted.</small>
            </>
          )}
          {error && <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setMode(null)} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy || (mode === 'readmit' && !sessionId)}>
              {busy ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
