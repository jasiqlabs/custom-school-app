'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TransportsNav } from '@/features/transports/components/transports-nav';
import { transportsApi } from '@/features/transports/api/transports-api-client';
import type { TransportDto, TransportStoppageDto } from '@custom-school/contracts';

export function TransportsUI() {
  const [transports, setTransports] = useState<TransportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictBanner, setConflictBanner] = useState<{
    message: string;
    activeCount: number;
    targetId: string;
    targetType: 'transport' | 'stoppage';
  } | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState<TransportDto | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<TransportDto | null>(null);
  const [stoppages, setStoppages] = useState<TransportStoppageDto[]>([]);
  const [stoppagesLoading, setStoppagesLoading] = useState(false);
  const [createStoppageOpen, setCreateStoppageOpen] = useState(false);
  const [editingStoppage, setEditingStoppage] = useState<TransportStoppageDto | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [transportNumber, setTransportNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dropTime, setDropTime] = useState('');
  const [saving, setSaving] = useState(false);

  // Stoppage form state
  const [stoppageName, setStoppageName] = useState('');
  const [savingStoppage, setSavingStoppage] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');

  const fetchTransports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transportsApi.listTransports();
      setTransports(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransports();
  }, [fetchTransports]);

  const loadStoppages = async (transport: TransportDto) => {
    try {
      setSelectedTransport(transport);
      setStoppagesLoading(true);
      const data = await transportsApi.listStoppages(transport.id);
      setStoppages(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load stoppages');
    } finally {
      setStoppagesLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setName('');
    setTransportNumber('');
    setVehicleNumber('');
    setPickupTime('');
    setDropTime('');
    setError(null);
    setCreateModalOpen(true);
  };

  const handleOpenEditModal = (t: TransportDto) => {
    setEditingTransport(t);
    setName(t.name);
    setTransportNumber(t.transportNumber);
    setVehicleNumber(t.vehicleNumber || '');
    setPickupTime(t.pickupTime || '');
    setDropTime(t.dropTime || '');
    setError(null);
    setCreateModalOpen(true);
  };

  const handleSaveTransport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setConflictBanner(null);

    try {
      if (editingTransport) {
        await transportsApi.updateTransport(editingTransport.id, {
          name,
          transportNumber,
          vehicleNumber: vehicleNumber || null,
          pickupTime: pickupTime || null,
          dropTime: dropTime || null,
        });
      } else {
        await transportsApi.createTransport({
          name,
          transportNumber,
          vehicleNumber: vehicleNumber || null,
          pickupTime: pickupTime || null,
          dropTime: dropTime || null,
        });
      }
      setCreateModalOpen(false);
      setEditingTransport(null);
      await fetchTransports();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transport');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTransportStatus = async (t: TransportDto) => {
    const nextStatus = t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setError(null);
    setConflictBanner(null);

    try {
      await transportsApi.updateTransportStatus(t.id, nextStatus);
      await fetchTransports();
      if (selectedTransport?.id === t.id) {
        setSelectedTransport({ ...t, status: nextStatus });
      }
    } catch (err: any) {
      if (err?.status === 409 && err?.details?.activeAssignmentCount) {
        setConflictBanner({
          message: err.message,
          activeCount: err.details.activeAssignmentCount,
          targetId: t.id,
          targetType: 'transport',
        });
      } else {
        setError(err?.message || 'Failed to update transport status');
      }
    }
  };

  const handleOpenAddStoppage = () => {
    setStoppageName('');
    setEditingStoppage(null);
    setError(null);
    setCreateStoppageOpen(true);
  };

  const handleOpenEditStoppage = (s: TransportStoppageDto) => {
    setStoppageName(s.name);
    setEditingStoppage(s);
    setError(null);
    setCreateStoppageOpen(true);
  };

  const handleSaveStoppage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransport) return;
    setSavingStoppage(true);
    setError(null);
    setConflictBanner(null);

    try {
      if (editingStoppage) {
        await transportsApi.updateStoppage(selectedTransport.id, editingStoppage.id, {
          name: stoppageName,
        });
      } else {
        await transportsApi.createStoppage(selectedTransport.id, {
          name: stoppageName,
          sortOrder: stoppages.length,
        });
      }
      setCreateStoppageOpen(false);
      setEditingStoppage(null);
      await loadStoppages(selectedTransport);
    } catch (err: any) {
      setError(err?.message || 'Failed to save stoppage');
    } finally {
      setSavingStoppage(false);
    }
  };

  const handleToggleStoppageStatus = async (s: TransportStoppageDto) => {
    if (!selectedTransport) return;
    const nextStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setError(null);
    setConflictBanner(null);

    try {
      await transportsApi.updateStoppageStatus(selectedTransport.id, s.id, nextStatus);
      await loadStoppages(selectedTransport);
    } catch (err: any) {
      if (err?.status === 409 && err?.details?.activeAssignmentCount) {
        setConflictBanner({
          message: err.message,
          activeCount: err.details.activeAssignmentCount,
          targetId: s.id,
          targetType: 'stoppage',
        });
      } else {
        setError(err?.message || 'Failed to update stoppage status');
      }
    }
  };

  const handleMoveStoppage = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!selectedTransport) return;
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stoppages.length) return;

    const newOrder = [...stoppages];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    setStoppages(newOrder);
    try {
      await transportsApi.reorderStoppages(
        selectedTransport.id,
        newOrder.map(s => s.id)
      );
    } catch (err: any) {
      setError('Failed to save stoppage reorder');
      await loadStoppages(selectedTransport);
    }
  };

  return (
    <div className="operator-container" style={{ width: '100%', paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Transport Management
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Configure transport routes, vehicle numbers, service timings, and ordered stoppages.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add New Route
        </button>
      </div>

      <TransportsNav />

      {/* Conflict / Active Assignment Blocking Banner */}
      {conflictBanner && (
        <div
          role="alert"
          style={{
            marginBottom: 20,
            padding: 16,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#991b1b', fontSize: 14 }}>Deactivation Blocked</div>
            <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 2 }}>{conflictBanner.message}</div>
            <div style={{ marginTop: 8 }}>
              <Link
                href={`/operator/transports/assignments?${
                  conflictBanner.targetType === 'transport' ? `transportId=${conflictBanner.targetId}` : `stoppageId=${conflictBanner.targetId}`
                }&status=ACTIVE`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#2563eb',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                View & Reassign {conflictBanner.activeCount} Active Assignment(s) &rarr;
              </Link>
            </div>
          </div>
          <button
            onClick={() => setConflictBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: 4 }}
          >
            &times;
          </button>
        </div>
      )}

      {error && !conflictBanner && (
        <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Main Grid: Routes List & Stoppages Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTransport ? '1.2fr 1fr' : '1fr', gap: 24 }}>
        {/* Left: Routes List */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>
              All Transport Routes ({transports.length})
            </h2>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search routes..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12.5,
                  width: 200,
                  outline: 'none',
                }}
              />
              {routeSearch && (
                <button
                  type="button"
                  onClick={() => setRouteSearch('')}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 2,
                  }}
                  title="Clear search"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Loading transport routes...</div>
          ) : transports.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>No transport routes configured yet.</p>
              <button
                onClick={handleOpenCreateModal}
                style={{
                  marginTop: 12,
                  color: '#2563eb',
                  background: 'none',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add your first transport route
              </button>
            </div>
          ) : transports.filter((t) => {
              if (!routeSearch.trim()) return true;
              const q = routeSearch.toLowerCase().trim();
              return t.name.toLowerCase().includes(q) || t.transportNumber.toLowerCase().includes(q) || (t.vehicleNumber || '').toLowerCase().includes(q);
            }).length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              No transport routes match &quot;{routeSearch}&quot;.
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setRouteSearch('')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                >
                  Clear Search
                </button>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Route / Name</th>
                    <th style={{ padding: '12px 16px' }}>Number</th>
                    <th style={{ padding: '12px 16px' }}>Vehicle</th>
                    <th style={{ padding: '12px 16px' }}>Timings</th>
                    <th style={{ padding: '12px 16px' }}>Active Students</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transports
                    .filter((t) => {
                      if (!routeSearch.trim()) return true;
                      const q = routeSearch.toLowerCase().trim();
                      return t.name.toLowerCase().includes(q) || t.transportNumber.toLowerCase().includes(q) || (t.vehicleNumber || '').toLowerCase().includes(q);
                    })
                    .map((t) => {
                      const isSelected = selectedTransport?.id === t.id;
                      return (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#f0f7ff' : '#ffffff',
                          transition: 'background 0.1s ease',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                          <button
                            onClick={() => loadStoppages(t)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                              textAlign: 'left',
                              fontSize: 13.5,
                            }}
                          >
                            {t.name}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{t.transportNumber}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>{t.vehicleNumber || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {t.pickupTime || t.dropTime ? `${t.pickupTime || '—'} / ${t.dropTime || '—'}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              background: t.activeAssignmentCount && t.activeAssignmentCount > 0 ? '#eff6ff' : '#f1f5f9',
                              color: t.activeAssignmentCount && t.activeAssignmentCount > 0 ? '#1d4ed8' : '#64748b',
                            }}
                          >
                            {t.activeAssignmentCount ?? 0} students
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11.5,
                              fontWeight: 600,
                              background: t.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                              color: t.status === 'ACTIVE' ? '#15803d' : '#64748b',
                            }}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              onClick={() => loadStoppages(t)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 12,
                                color: '#2563eb',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              Stoppages
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(t)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 12,
                                color: '#475569',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleTransportStatus(t)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 12,
                                color: t.status === 'ACTIVE' ? '#dc2626' : '#16a34a',
                                background: t.status === 'ACTIVE' ? '#fef2f2' : '#f0fdf4',
                                border: `1px solid ${t.status === 'ACTIVE' ? '#fecaca' : '#bbf7d0'}`,
                                borderRadius: 4,
                                cursor: 'pointer',
                              }}
                            >
                              {t.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Stoppages Panel */}
        {selectedTransport && (
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Stoppages for {selectedTransport.name}
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {selectedTransport.transportNumber} &bull; {stoppages.length} stops
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleOpenAddStoppage}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  + Add Stop
                </button>
                <button
                  onClick={() => setSelectedTransport(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>
            </div>

            {stoppagesLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading stoppages...</div>
            ) : stoppages.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>No stoppages defined for this route.</p>
                <button
                  onClick={handleOpenAddStoppage}
                  style={{ marginTop: 8, color: '#2563eb', background: 'none', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add first stoppage
                </button>
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {stoppages.map((s, idx) => (
                  <div
                    key={s.id}
                    style={{
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                          {s.activeAssignmentCount ?? 0} active student(s) &bull;{' '}
                          <span style={{ color: s.status === 'ACTIVE' ? '#15803d' : '#64748b', fontWeight: 600 }}>{s.status}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => handleMoveStoppage(idx, 'UP')}
                        disabled={idx === 0}
                        title="Move Up"
                        aria-label={`Move ${s.name} up`}
                        style={{
                          padding: '4px 6px',
                          fontSize: 11,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 4,
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          opacity: idx === 0 ? 0.4 : 1,
                        }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveStoppage(idx, 'DOWN')}
                        disabled={idx === stoppages.length - 1}
                        title="Move Down"
                        aria-label={`Move ${s.name} down`}
                        style={{
                          padding: '4px 6px',
                          fontSize: 11,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 4,
                          cursor: idx === stoppages.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: idx === stoppages.length - 1 ? 0.4 : 1,
                        }}
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => handleOpenEditStoppage(s)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 11,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 4,
                          cursor: 'pointer',
                          marginLeft: 4,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStoppageStatus(s)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 11,
                          color: s.status === 'ACTIVE' ? '#dc2626' : '#16a34a',
                          background: s.status === 'ACTIVE' ? '#fef2f2' : '#f0fdf4',
                          border: `1px solid ${s.status === 'ACTIVE' ? '#fecaca' : '#bbf7d0'}`,
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Transport */}
      {createModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 8, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {editingTransport ? 'Edit Transport Route' : 'Add New Transport Route'}
              </h3>
              <button onClick={() => setCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleSaveTransport} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Route Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North Campus Express"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Transport / Route Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BUS-01"
                  value={transportNumber}
                  onChange={(e) => setTransportNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Vehicle Plate / Reg Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. KA-01-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Pickup Time (HH:MM)
                  </label>
                  <input
                    type="text"
                    placeholder="07:30"
                    pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Drop Time (HH:MM)
                  </label>
                  <input
                    type="text"
                    placeholder="15:30"
                    pattern="^([01]\d|2[0-3]):([0-5]\d)$"
                    value={dropTime}
                    onChange={(e) => setDropTime(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '8px 18px', background: '#2563eb', color: '#ffffff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  {saving ? 'Saving...' : editingTransport ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Stoppage */}
      {createStoppageOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 8, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {editingStoppage ? 'Edit Stoppage' : `Add Stoppage to ${selectedTransport?.name}`}
              </h3>
              <button onClick={() => setCreateStoppageOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <form onSubmit={handleSaveStoppage} style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Stoppage Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Hospital Cross"
                  value={stoppageName}
                  onChange={(e) => setStoppageName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCreateStoppageOpen(false)}
                  style={{ padding: '8px 14px', background: '#f1f5f9', color: '#475569', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStoppage}
                  style={{ padding: '8px 16px', background: '#2563eb', color: '#ffffff', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  {savingStoppage ? 'Saving...' : editingStoppage ? 'Update Stoppage' : 'Add Stoppage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
