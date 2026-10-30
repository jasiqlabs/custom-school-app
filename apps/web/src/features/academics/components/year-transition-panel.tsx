'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AcademicSessionDto } from '@custom-school/contracts';

type Decision = 'PROMOTE' | 'REPEAT' | 'PASS_OUT' | 'LEAVE';
type Choice = { decision: Decision | ''; targetClassId: string; targetSectionId: string };
type SchoolClass = { id: string; name: string; status: string; sections: Array<{ id: string; classId: string; name: string; status: string }> };
type Batch = { id: string; sourceSessionId: string; targetSessionId: string; status: string; _count?: { items: number } };
type Candidate = {
  id: string; studentId: string; enrollmentVersion: number; classId: string; sectionId: string;
  student: { studentCode: string; fullName: string };
  staged?: { decision: Decision; targetClassId: string | null; targetSectionId: string | null } | null;
};
type Candidates = { batch: Batch; total: number; page: number; size: number; stagedCount: number; items: Candidate[] };
type Progress = { total: number; processed: number; remaining: number; readyToFinalize: boolean };

export function YearTransitionPanel({ baseApiUrl, sessions, onComplete }: {
  baseApiUrl: string; sessions: AcademicSessionDto[]; onComplete: () => Promise<void>;
}) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [page, setPage] = useState(1);
  const [candidateData, setCandidateData] = useState<Candidates | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const batch = batches.find(b => b.id === batchId);
  const source = sessions.find(s => s.status === 'ACTIVE' || s.status === 'CLOSING');
  const targets = sessions.filter(s => s.status === 'DRAFT');
  const classUrl = baseApiUrl.startsWith('/platform/schools/')
    ? baseApiUrl.replace(/\/academic-sessions$/, '/classes')
    : '/operator/students/classes';

  const loadBatches = useCallback(async () => {
    const rows = await api<Batch[]>(`${baseApiUrl}/transitions`);
    setBatches(rows);
    setBatchId(previous => rows.some(b => b.id === previous)
      ? previous : (rows.find(b => b.status !== 'COMPLETED')?.id || ''));
  }, [baseApiUrl]);

  useEffect(() => {
    let live = true;
    Promise.all([api<Batch[]>(`${baseApiUrl}/transitions`), api<SchoolClass[]>(classUrl)])
      .then(([rows, groups]) => {
        if (!live) return;
        setBatches(rows);
        setBatchId(rows.find(b => b.status !== 'COMPLETED')?.id || '');
        setClasses(groups.filter(c => c.status === 'ACTIVE'));
      })
      .catch(e => { if (live) setError(e.message || 'Unable to load year transitions'); });
    return () => { live = false; };
  }, [baseApiUrl, classUrl]);

  const loadCandidates = useCallback(async (id: string, pageNumber: number) => {
    const data = await api<Candidates>(`${baseApiUrl}/transitions/${id}/candidates?page=${pageNumber}&size=50`);
    setCandidateData(data);
    setChoices(Object.fromEntries(data.items.map(item => [item.studentId, {
      decision: item.staged?.decision || '',
      targetClassId: item.staged?.targetClassId || item.classId,
      targetSectionId: item.staged?.targetSectionId || item.sectionId,
    }])));
  }, [baseApiUrl]);
  useEffect(() => {
    if (!batchId) { setCandidateData(null); return; }
    let live = true;
    api<Candidates>(`${baseApiUrl}/transitions/${batchId}/candidates?page=${page}&size=50`)
      .then(data => {
        if (!live) return;
        setCandidateData(data);
        setChoices(Object.fromEntries(data.items.map(item => [item.studentId, {
          decision: item.staged?.decision || '',
          targetClassId: item.staged?.targetClassId || item.classId,
          targetSectionId: item.staged?.targetSectionId || item.sectionId,
        }])));
      }).catch(e => { if (live) setError(e.message || 'Unable to load student decisions'); });
    return () => { live = false; };
  }, [baseApiUrl, batchId, page]);

  const remaining = useMemo(() => candidateData
    ? Math.max(0, candidateData.total - candidateData.stagedCount) : 0, [candidateData]);

  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await work(); } catch (e: any) { setError(e.message || 'Unable to complete step'); }
    finally { setBusy(false); }
  }

  function setChoice(studentId: string, change: Partial<Choice>) {
    setChoices(old => ({ ...old, [studentId]: { ...old[studentId], ...change } }));
  }

  return (
    <section aria-label="Year-end promotion" style={{ marginTop: 24, border: '1px solid #cbd5e1',
      background: '#f8fafc', borderRadius: 12, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Year-End Promotion & Closing</h3>
      <p style={{ fontSize: 13, color: '#475569' }}>
        Review every student before closing. Save up to 50 decisions at a time.
        Processing can be resumed after a refresh. Prior receipts and unpaid balances are preserved.
      </p>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {notice && <p role="status" style={{ color: '#166534' }}>{notice}</p>}
      {source && targets.length > 0 && !batch && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>From {source.label} to</strong>
          <label>Target year
            <select value={targetId} onChange={e => setTargetId(e.target.value)}>
              <option value="">Select next DRAFT year</option>
              {targets.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <button className="btn btn-primary" disabled={!targetId || busy} onClick={() => run(async () => {
            const made = await api<Batch>(`${baseApiUrl}/transitions`, {
              method: 'POST', body: JSON.stringify({ sourceSessionId: source.id, targetSessionId: targetId }),
            });
            await loadBatches(); setBatchId(made.id); setPage(1);
          })}>Start Review</button>
        </div>
      )}
      {!batch && !source && <p>No active year. Complete an existing transition or activate an initial year.</p>}
      {batch && (
        <>
          <p><strong>Status:</strong> {batch.status} · Target year: {sessions.find(s => s.id === batch.targetSessionId)?.label || 'Next year'}</p>
          {batch.status === 'DRAFT' && candidateData && (
            <>
              <p>Reviewed {candidateData.stagedCount} / {candidateData.total} students. {remaining} still need decisions.</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead><tr><th>Student</th><th>Decision</th><th>Target class</th><th>Section</th></tr></thead>
                  <tbody>{candidateData.items.map(item => {
                    const choice = choices[item.studentId] || { decision: '', targetClassId: '', targetSectionId: '' };
                    const chosen = classes.find(c => c.id === choice.targetClassId);
                    const moving = choice.decision === 'PROMOTE' || choice.decision === 'REPEAT';
                    return <tr key={item.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td>{item.student.studentCode} — {item.student.fullName}</td>
                      <td><select aria-label={`Decision for ${item.student.fullName}`} value={choice.decision}
                        onChange={e => setChoice(item.studentId, { decision: e.target.value as Decision })}>
                        <option value="">Choose</option>
                        <option value="PROMOTE">Promote</option><option value="REPEAT">Repeat year</option>
                        <option value="PASS_OUT">Pass out</option><option value="LEAVE">Leave</option>
                      </select></td>
                      <td><select disabled={!moving} aria-label={`Class for ${item.student.fullName}`}
                        value={choice.targetClassId} onChange={e => {
                          const cls = classes.find(c => c.id === e.target.value);
                          setChoice(item.studentId, { targetClassId: e.target.value, targetSectionId: cls?.sections[0]?.id || '' });
                        }}>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select></td>
                      <td><select disabled={!moving} aria-label={`Section for ${item.student.fullName}`}
                        value={choice.targetSectionId}
                        onChange={e => setChoice(item.studentId, { targetSectionId: e.target.value })}>
                        {(chosen?.sections || []).filter(x => x.status === 'ACTIVE').map(sec =>
                          <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                      </select></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" disabled={busy || page === 1}
                  onClick={() => setPage(page - 1)}>Previous</button>
                <span>Page {page} of {Math.max(1, Math.ceil(candidateData.total / candidateData.size))}</span>
                <button className="btn btn-secondary" disabled={busy || page * candidateData.size >= candidateData.total}
                  onClick={() => setPage(page + 1)}>Next</button>
                <button className="btn btn-primary" disabled={busy} onClick={() => run(async () => {
                  const items = candidateData.items.filter(item => choices[item.studentId]?.decision).map(item => {
                    const x = choices[item.studentId]; const moving = x.decision === 'PROMOTE' || x.decision === 'REPEAT';
                    return { studentId: item.studentId, sourceEnrollmentId: item.id,
                      sourceVersion: item.enrollmentVersion, decision: x.decision,
                      targetClassId: moving ? x.targetClassId : null,
                      targetSectionId: moving ? x.targetSectionId : null };
                  });
                  if (!items.length) throw new Error('Choose at least one student decision');
                  await api(`${baseApiUrl}/transitions/${batch.id}/stage`, { method: 'POST', body: JSON.stringify({ items }) });
                  await loadCandidates(batch.id, page);
                  setNotice(`Saved ${items.length} decisions`);
                })}>Save Page Decisions</button>
                <button className="btn btn-primary" disabled={busy || remaining !== 0 || candidateData.total === 0}
                  onClick={() => run(async () => {
                    await api(`${baseApiUrl}/transitions/${batch.id}/prepare`, { method: 'POST' });
                    await loadBatches();
                  })}>Confirm Reviewed Plan</button>
              </div>
            </>
          )}
          {(batch.status === 'PREPARED' || batch.status === 'CLOSING') && (
            <div>
              <p>Processing is idempotent and resumable. Each request handles at most 50 students.</p>
              {progress && <p role="status">{progress.processed} / {progress.total} processed; {progress.remaining} remaining</p>}
              <button className="btn btn-primary" disabled={busy || progress?.readyToFinalize}
                onClick={() => run(async () => {
                  const result = await api<Progress>(`${baseApiUrl}/transitions/${batch.id}/process`, { method: 'POST' });
                  setProgress(result); await loadBatches();
                })}>Process Next 50</button>
              <button className="btn btn-secondary" disabled={busy || !progress?.readyToFinalize}
                onClick={() => run(async () => {
                  if (!window.confirm('Finalize year transition? This ends old active enrollments and activates the target year.')) return;
                  await api(`${baseApiUrl}/transitions/${batch.id}/finalize`, { method: 'POST' });
                  setProgress(null); await loadBatches(); await onComplete();
                  setNotice('Academic year finalized. Existing receipts and prior dues remain available.');
                })}>Finalize Year</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
