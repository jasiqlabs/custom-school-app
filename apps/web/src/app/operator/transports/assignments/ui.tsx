'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransportsNav } from '@/features/transports/components/transports-nav';
import { transportsApi, type StudentSearchResult } from '@/features/transports/api/transports-api-client';
import type {
  ActiveTransportChoicesDto,
  TransportAssignmentDto,
} from '@custom-school/contracts';

export function AssignmentsUI() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get('studentId') || '';
  const initialTransportId = searchParams.get('transportId') || '';
  const initialStoppageId = searchParams.get('stoppageId') || '';
  const initialStatus = searchParams.get('status') || 'ALL';
  const initialEffectiveNow = searchParams.get('effectiveNow') === 'true';

  // State
  const [choices, setChoices] = useState<ActiveTransportChoicesDto>({ transports: [] });
  const [choicesLoading, setChoicesLoading] = useState(true);

  // Student Search / Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);

  // Current active assignment for selected student
  const [studentAssignment, setStudentAssignment] = useState<TransportAssignmentDto | null>(null);
  const [loadingStudentAssignment, setLoadingStudentAssignment] = useState(false);

  // New Assignment Form State
  const [stoppageId, setStoppageId] = useState(initialStoppageId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Reassign Modal
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [targetAssignmentForReassign, setTargetAssignmentForReassign] = useState<TransportAssignmentDto | null>(null);
  const [newStoppageId, setNewStoppageId] = useState('');
  const [reassignStartDate, setReassignStartDate] = useState('');
  const [reassignEndDate, setReassignEndDate] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // End Modal
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [targetAssignmentForEnd, setTargetAssignmentForEnd] = useState<TransportAssignmentDto | null>(null);
  const [endReason, setEndReason] = useState('');
  const [setPrefNo, setSetPrefNo] = useState(false);
  const [ending, setEnding] = useState(false);

  // Directory Table State
  const [dirQuery, setDirQuery] = useState('');
  const [dirTransportId, setDirTransportId] = useState(initialTransportId);
  const [dirStoppageId, setDirStoppageId] = useState(initialStoppageId);
  const [dirStatus, setDirStatus] = useState<string>(initialStatus);
  const [dirEffectiveNow, setDirEffectiveNow] = useState(initialEffectiveNow);
  const [assignments, setAssignments] = useState<TransportAssignmentDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [dirLoading, setDirLoading] = useState(true);

  // Global Alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load choices
  useEffect(() => {
    async function loadChoices() {
      try {
        setChoicesLoading(true);
        const data = await transportsApi.getActiveChoices();
        setChoices(data);
      } catch (err: any) {
        console.error('Failed to load active choices', err);
      } finally {
        setChoicesLoading(false);
      }
    }
    loadChoices();
  }, []);

  // Fetch Directory Assignments
  const fetchDirectory = useCallback(async () => {
    try {
      setDirLoading(true);
      const res = await transportsApi.listAssignments({
        query: dirQuery || undefined,
        transportId: dirTransportId || undefined,
        stoppageId: dirStoppageId || undefined,
        status: dirStatus as any,
        effectiveNow: dirEffectiveNow ? true : undefined,
        page,
        limit: 15,
      });
      setAssignments(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch assignment directory');
    } finally {
      setDirLoading(false);
    }
  }, [dirQuery, dirTransportId, dirStoppageId, dirStatus, dirEffectiveNow, page]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Handle student search debounced
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const results = await transportsApi.searchStudents(searchQuery);
        setSearchResults(results);
      } finally {
        setSearchingStudents(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Check current assignment when student selected
  const checkStudentAssignment = useCallback(async (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    setSuccess(null);
    setLoadingStudentAssignment(true);

    try {
      const res = await transportsApi.listAssignments({
        query: student.studentCode,
        status: 'ACTIVE',
        limit: 1,
      });
      const active = res.items.find(i => i.studentId === student.id && i.status === 'ACTIVE');
      setStudentAssignment(active || null);
    } catch {
      setStudentAssignment(null);
    } finally {
      setLoadingStudentAssignment(false);
    }
  }, []);

  // Auto-select if initialStudentId present in query params
  useEffect(() => {
    if (initialStudentId) {
      transportsApi.searchStudents(initialStudentId).then(results => {
        const match = results.find(r => r.id === initialStudentId);
        if (match) checkStudentAssignment(match);
      });
    }
  }, [initialStudentId, checkStudentAssignment]);

  // Submit New Assignment
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !stoppageId) return;

    if (startDate && endDate && endDate < startDate) {
      setError('Service end date cannot precede start date');
      return;
    }

    setAssigning(true);
    setError(null);
    setSuccess(null);

    try {
      await transportsApi.assignStudent({
        studentId: selectedStudent.id,
        stoppageId,
        serviceStartDate: startDate || null,
        serviceEndDate: endDate || null,
      });
      setSuccess(`Transport successfully assigned to ${selectedStudent.fullName}!`);
      setStoppageId('');
      setStartDate('');
      setEndDate('');
      await checkStudentAssignment(selectedStudent);
      await fetchDirectory();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign transport');
    } finally {
      setAssigning(false);
    }
  };

  // Open Reassign
  const handleOpenReassign = (assignment: TransportAssignmentDto) => {
    setTargetAssignmentForReassign(assignment);
    setNewStoppageId('');
    setReassignStartDate(assignment.serviceStartDate || '');
    setReassignEndDate(assignment.serviceEndDate || '');
    setReassignReason('');
    setError(null);
    setReassignModalOpen(true);
  };

  // Submit Reassign
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssignmentForReassign || !newStoppageId) return;

    if (reassignStartDate && reassignEndDate && reassignEndDate < reassignStartDate) {
      setError('Service end date cannot precede start date');
      return;
    }

    setReassigning(true);
    setError(null);

    try {
      await transportsApi.reassignStudent(targetAssignmentForReassign.id, {
        newStoppageId,
        serviceStartDate: reassignStartDate || null,
        serviceEndDate: reassignEndDate || null,
        reason: reassignReason || null,
      });
      setSuccess('Transport successfully reassigned!');
      setReassignModalOpen(false);
      setTargetAssignmentForReassign(null);
      if (selectedStudent) await checkStudentAssignment(selectedStudent);
      await fetchDirectory();
    } catch (err: any) {
      setError(err?.message || 'Failed to reassign transport');
    } finally {
      setReassigning(false);
    }
  };

  // Open End Modal
  const handleOpenEnd = (assignment: TransportAssignmentDto) => {
    setTargetAssignmentForEnd(assignment);
    setEndReason('');
    setSetPrefNo(false);
    setError(null);
    setEndModalOpen(true);
  };

  // Submit End
  const handleEndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssignmentForEnd) return;

    setEnding(true);
    setError(null);

    try {
      await transportsApi.endAssignment(targetAssignmentForEnd.id, {
        reason: endReason || null,
        setStudentPreferenceNo: setPrefNo,
      });
      setSuccess('Transport assignment ended.');
      setEndModalOpen(false);
      setTargetAssignmentForEnd(null);
      if (selectedStudent) await checkStudentAssignment(selectedStudent);
      await fetchDirectory();
    } catch (err: any) {
      setError(err?.message || 'Failed to end assignment');
    } finally {
      setEnding(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Student Transport Assignments
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          Search students, assign active stoppage/route with optional service dates, reassign atomically, and inspect full assignment history.
        </p>
      </div>

      <TransportsNav />

      {/* Alerts */}
      {error && (
        <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 13, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#f0fdf4', color: '#15803d', borderRadius: 6, fontSize: 13, border: '1px solid #bbf7d0' }}>
          {success}
        </div>
      )}

      {/* Top Section: Assign Flow */}
      <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 24, marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
          Assign Student to Transport
        </h2>

        {/* Student Search Combobox */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
            Search Active Student by ID / Name / SR
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Type student name or ID (e.g. STU-001, John)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '9px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13.5 }}
            />
            {selectedStudent && (
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentAssignment(null);
                }}
                style={{ padding: '9px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {searchingStudents && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, zIndex: 20, fontSize: 13, color: '#64748b' }}>
              Searching students...
            </div>
          )}
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4, zIndex: 20, maxHeight: 240, overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              {searchResults.map((s) => (
                <div
                  key={s.id}
                  onClick={() => checkStudentAssignment(s)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.fullName}</span>{' '}
                    <span style={{ color: '#64748b' }}>({s.studentCode})</span>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>Class: {s.className} {s.sectionName || ''}</div>
                  </div>
                  <div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: s.transportRequired ? '#dcfce7' : '#fef3c7',
                        color: s.transportRequired ? '#15803d' : '#92400e',
                      }}
                    >
                      {s.transportRequired ? 'Transport: YES' : 'Transport: NO'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Student Card */}
        {selectedStudent && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{selectedStudent.fullName}</span>{' '}
                <span style={{ fontSize: 13, color: '#64748b' }}>({selectedStudent.studentCode})</span>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Class: <strong>{selectedStudent.className} {selectedStudent.sectionName || ''}</strong> &bull; Status: <strong>{selectedStudent.status}</strong>
                </div>
              </div>
              <div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    background: selectedStudent.transportRequired ? '#dcfce7' : '#fee2e2',
                    color: selectedStudent.transportRequired ? '#15803d' : '#b91c1c',
                  }}
                >
                  Transport Required: {selectedStudent.transportRequired ? 'YES' : 'NO'}
                </span>
              </div>
            </div>

            {/* Warning if Transport Required is NO */}
            {!selectedStudent.transportRequired && (
              <div style={{ marginTop: 12, padding: 10, background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 6, color: '#92400e', fontSize: 12.5 }}>
                &bull; <strong>Cannot assign transport:</strong> This student does not have <em>Transport Required</em> enabled.
                Please update the student profile in Student Management before assigning a route.
              </div>
            )}

            {/* If Student Already Has Active Assignment */}
            {loadingStudentAssignment ? (
              <div style={{ marginTop: 14, fontSize: 13, color: '#64748b' }}>Checking current transport assignments...</div>
            ) : studentAssignment ? (
              <div style={{ marginTop: 14, padding: 14, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Current Active Assignment
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>
                      {studentAssignment.transportName} ({studentAssignment.transportNumber}) &rarr; {studentAssignment.stoppageName}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                      Service: {studentAssignment.serviceStartDate || 'Open start'} &rarr; {studentAssignment.serviceEndDate || 'Open end'} &bull; Started {new Date(studentAssignment.startedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleOpenReassign(studentAssignment)}
                      style={{ padding: '6px 12px', background: '#2563eb', color: '#ffffff', borderRadius: 4, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Reassign
                    </button>
                    <button
                      onClick={() => handleOpenEnd(studentAssignment)}
                      style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', borderRadius: 4, border: '1px solid #fca5a5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      End Assignment
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedStudent.transportRequired ? (
              /* Assign Form when student has no active assignment */
              <form onSubmit={handleAssign} style={{ marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Select Stoppage & Route <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      required
                      value={stoppageId}
                      onChange={(e) => setStoppageId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
                    >
                      <option value="">-- Choose Stoppage --</option>
                      {choices.transports.map((t) => (
                        <optgroup key={t.id} label={`${t.name} (${t.transportNumber})`}>
                          {t.stoppages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Stop #{s.sortOrder + 1})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={assigning || !stoppageId}
                      style={{
                        padding: '9px 18px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13.5,
                        fontWeight: 600,
                        cursor: assigning || !stoppageId ? 'not-allowed' : 'pointer',
                        opacity: assigning || !stoppageId ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {assigning ? 'Assigning...' : 'Assign Transport'}
                    </button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom Section: Assignment Directory */}
      <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Assignment Directory ({totalCount})
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Effective Now Toggle */}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={dirEffectiveNow}
                  onChange={(e) => {
                    setDirEffectiveNow(e.target.checked);
                    setPage(1);
                  }}
                />
                <span style={{ fontWeight: 600 }}>Effective Now Only</span>
              </label>

              {/* Status Filter */}
              <select
                value={dirStatus}
                onChange={(e) => {
                  setDirStatus(e.target.value);
                  setPage(1);
                }}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE Only</option>
                <option value="ENDED">ENDED Only</option>
              </select>

              {/* Route Filter */}
              <select
                value={dirTransportId}
                onChange={(e) => {
                  setDirTransportId(e.target.value);
                  setPage(1);
                }}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5 }}
              >
                <option value="">All Routes</option>
                {choices.transports.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.transportNumber})
                  </option>
                ))}
              </select>

              {/* Student Query Filter */}
              <input
                type="text"
                placeholder="Filter by student..."
                value={dirQuery}
                onChange={(e) => {
                  setDirQuery(e.target.value);
                  setPage(1);
                }}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12.5, width: 160 }}
              />
            </div>
          </div>
        </div>

        {/* Directory Table */}
        {dirLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Loading directory...</div>
        ) : assignments.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            No transport assignments found matching criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Student</th>
                  <th style={{ padding: '12px 16px' }}>Class</th>
                  <th style={{ padding: '12px 16px' }}>Transport Route</th>
                  <th style={{ padding: '12px 16px' }}>Stoppage</th>
                  <th style={{ padding: '12px 16px' }}>Service Window</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Effective</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      <div>{row.studentName}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>{row.studentCode}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {row.className} {row.sectionName || ''}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 500 }}>
                      {row.transportName}{' '}
                      <span style={{ fontSize: 11.5, color: '#64748b' }}>({row.transportNumber})</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{row.stoppageName}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {row.serviceStartDate || 'Open'} &rarr; {row.serviceEndDate || 'Open'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          background: row.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                          color: row.status === 'ACTIVE' ? '#15803d' : '#64748b',
                        }}
                      >
                        {row.status}
                      </span>
                      {row.endedReason && (
                        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>{row.endedReason}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: row.effectiveNow ? '#eff6ff' : '#f8fafc',
                          color: row.effectiveNow ? '#1d4ed8' : '#94a3b8',
                          border: row.effectiveNow ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        }}
                      >
                        {row.effectiveNow ? 'Effective Now' : 'Not Effective'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {row.status === 'ACTIVE' && (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => handleOpenReassign(row)}
                            style={{ padding: '4px 8px', fontSize: 12, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, cursor: 'pointer' }}
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => handleOpenEnd(row)}
                            style={{ padding: '4px 8px', fontSize: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 4, cursor: 'pointer' }}
                          >
                            End
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 15 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#64748b' }}>
            <span>Page {page} of {Math.ceil(totalCount / 15)}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                style={{ padding: '4px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => (p * 15 < totalCount ? p + 1 : p))}
                disabled={page * 15 >= totalCount}
                style={{ padding: '4px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: page * 15 >= totalCount ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Reassign */}
      {reassignModalOpen && targetAssignmentForReassign && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 8, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Reassign Student Transport
              </h3>
              <button onClick={() => setReassignModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleReassignSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14, padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 12.5, color: '#475569' }}>
                Reassigning: <strong>{targetAssignmentForReassign.studentName}</strong> ({targetAssignmentForReassign.studentCode})<br />
                Current: <em>{targetAssignmentForReassign.transportName} &rarr; {targetAssignmentForReassign.stoppageName}</em>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  New Stoppage & Route <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  required
                  value={newStoppageId}
                  onChange={(e) => setNewStoppageId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
                >
                  <option value="">-- Choose New Stoppage --</option>
                  {choices.transports.map((t) => (
                    <optgroup key={t.id} label={`${t.name} (${t.transportNumber})`}>
                      {t.stoppages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Stop #{s.sortOrder + 1})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    New Start Date
                  </label>
                  <input
                    type="date"
                    value={reassignStartDate}
                    onChange={(e) => setReassignStartDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    New End Date
                  </label>
                  <input
                    type="date"
                    value={reassignEndDate}
                    onChange={(e) => setReassignEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Reason for Reassignment (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Address changed, route schedule shifted"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning || !newStoppageId}
                  style={{ padding: '8px 18px', background: '#2563eb', color: '#ffffff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  {reassigning ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: End Assignment */}
      {endModalOpen && targetAssignmentForEnd && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 8, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#dc2626' }}>
                End Transport Assignment
              </h3>
              <button onClick={() => setEndModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleEndSubmit} style={{ padding: 20 }}>
              <p style={{ fontSize: 13, color: '#334155', margin: '0 0 14px 0' }}>
                Are you sure you want to end transport assignment for <strong>{targetAssignmentForEnd.studentName}</strong>?
                This record will be marked ENDED and retained in assignment history.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Parent requested cancellation"
                  value={endReason}
                  onChange={(e) => setEndReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={setPrefNo}
                    onChange={(e) => setSetPrefNo(e.target.checked)}
                  />
                  <span>Update student profile preference to <strong>No Transport</strong></span>
                </label>
                <div style={{ fontSize: 11.5, color: '#64748b', marginLeft: 22, marginTop: 2 }}>
                  If unchecked and student still has Transport Required = YES, setup state returns to <em>SETUP_PENDING</em>.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEndModalOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ending}
                  style={{ padding: '8px 18px', background: '#dc2626', color: '#ffffff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  {ending ? 'Ending...' : 'End Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
