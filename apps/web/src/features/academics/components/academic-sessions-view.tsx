'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { AcademicSessionDto } from '@custom-school/contracts';

interface AcademicSessionsViewProps {
  baseApiUrl: string;
  title?: string;
  canManage?: boolean;
}

export function AcademicSessionsView({
  baseApiUrl,
  title = 'Academic Sessions',
  canManage = true,
}: AcademicSessionsViewProps) {
  const [sessions, setSessions] = useState<AcademicSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal: Create Session
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createLabel, setCreateLabel] = useState('');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal: Edit Session
  const [editingSession, setEditingSession] = useState<AcademicSessionDto | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal: Confirm Activate
  const [activatingSession, setActivatingSession] = useState<AcademicSessionDto | null>(null);
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<{ items: AcademicSessionDto[]; total: number }>(`${baseApiUrl}?page=1&size=50`);
      setSessions(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load academic sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [baseApiUrl]);

  const activeSession = sessions.find((s) => s.status === 'ACTIVE');

  // Handle Create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCode.trim() || !createLabel.trim() || !createStartDate || !createEndDate) {
      setCreateError('All fields are required.');
      return;
    }
    if (createEndDate < createStartDate) {
      setCreateError('End Date must be greater than or equal to Start Date.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      await api(baseApiUrl, {
        method: 'POST',
        body: JSON.stringify({
          code: createCode.trim(),
          label: createLabel.trim(),
          startDate: createStartDate,
          endDate: createEndDate,
        }),
      });
      setShowCreateModal(false);
      setCreateCode('');
      setCreateLabel('');
      setCreateStartDate('');
      setCreateEndDate('');
      await loadSessions();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create academic session');
    } finally {
      setCreating(false);
    }
  };

  // Open Edit
  const openEdit = (s: AcademicSessionDto) => {
    setEditingSession(s);
    setEditLabel(s.label);
    setEditStartDate(s.startDate);
    setEditEndDate(s.endDate);
    setEditError(null);
  };

  // Handle Update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    if (!editLabel.trim() || !editStartDate || !editEndDate) {
      setEditError('All fields are required.');
      return;
    }
    if (editEndDate < editStartDate) {
      setEditError('End Date must be greater than or equal to Start Date.');
      return;
    }

    try {
      setUpdating(true);
      setEditError(null);
      await api(`${baseApiUrl}/${editingSession.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          version: editingSession.version,
          label: editLabel.trim(),
          startDate: editStartDate,
          endDate: editEndDate,
        }),
      });
      setEditingSession(null);
      await loadSessions();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update academic session');
    } finally {
      setUpdating(false);
    }
  };

  // Handle Activate
  const handleActivate = async () => {
    if (!activatingSession) return;
    try {
      setActivating(true);
      setActivateError(null);
      await api(`${baseApiUrl}/${activatingSession.id}/activate`, {
        method: 'POST',
        body: JSON.stringify({
          version: activatingSession.version,
        }),
      });
      setActivatingSession(null);
      await loadSessions();
    } catch (err: any) {
      setActivateError(err.message || 'Failed to activate academic session');
    } finally {
      setActivating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
            ACTIVE
          </span>
        );
      case 'CLOSING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: '#fef3c7', color: '#b45309', fontSize: 12, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
            CLOSING
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999, background: '#e2e8f0', color: '#334155', fontSize: 12, fontWeight: 600 }}>
            DRAFT
          </span>
        );
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{title}</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Define school years, manage term dates, and activate the current operational session.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
            style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8 }}
          >
            + New Academic Session
          </button>
        )}
      </div>

      {/* Alert if no active session */}
      {!loading && !activeSession && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <div style={{ fontSize: 13, color: '#1e40af' }}>
            <strong>No Academic Session is currently ACTIVE.</strong> Activate an academic session below to set the official working year.
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          Loading academic sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: 14, margin: '0 0 12px' }}>No academic sessions configured yet.</p>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
            >
              Create First Session (e.g. 2026-27)
            </button>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Label</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Duration</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                {canManage && <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                    {s.code}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>
                    {s.label}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>
                    {s.startDate} &rarr; {s.endDate}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {getStatusBadge(s.status)}
                  </td>
                  {canManage && (
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        {s.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActivateError(null);
                              setActivatingSession(s);
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: '4px 10px', color: '#15803d', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                          >
                            Activate
                          </button>
                        )}

                        {s.status !== 'CLOSED' && (
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: '4px 10px' }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Session */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>New Academic Session</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: 20 }}>
              {createError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: '#991b1b', fontSize: 12.5 }}>
                  {createError}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Session Code <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026-27"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Session Label <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Academic Year 2026-2027"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Start Date <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={createStartDate}
                    onChange={(e) => setCreateStartDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    End Date <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={createEndDate}
                    onChange={(e) => setCreateEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ fontSize: 13 }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary" style={{ fontSize: 13 }}>
                  {creating ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Session */}
      {editingSession && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Edit Academic Session ({editingSession.code})
              </h3>
              <button type="button" onClick={() => setEditingSession(null)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            <form onSubmit={handleUpdate} style={{ padding: 20 }}>
              {editError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: '#991b1b', fontSize: 12.5 }}>
                  {editError}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Session Label <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Start Date <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    End Date <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setEditingSession(null)} className="btn btn-secondary" style={{ fontSize: 13 }}>
                  Cancel
                </button>
                <button type="submit" disabled={updating} className="btn btn-primary" style={{ fontSize: 13 }}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Activation */}
      {activatingSession && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 440, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Confirm Activation</h3>
              <button type="button" onClick={() => setActivatingSession(null)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            <div style={{ padding: 20 }}>
              {activateError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: '#991b1b', fontSize: 12.5 }}>
                  {activateError}
                </div>
              )}

              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.5, margin: '0 0 16px' }}>
                Are you sure you want to activate <strong>{activatingSession.label}</strong> ({activatingSession.code})?
              </p>
              <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.4, margin: '0 0 20px' }}>
                This will establish <strong>{activatingSession.code}</strong> ({activatingSession.startDate} &rarr; {activatingSession.endDate}) as the current operational academic year for this school.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setActivatingSession(null)} className="btn btn-secondary" style={{ fontSize: 13 }}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={activating}
                  className="btn btn-primary"
                  style={{ fontSize: 13, background: '#16a34a', borderColor: '#16a34a' }}
                >
                  {activating ? 'Activating...' : 'Yes, Activate Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
