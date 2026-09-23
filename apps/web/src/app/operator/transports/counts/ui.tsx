'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TransportsNav } from '@/features/transports/components/transports-nav';
import { transportsApi } from '@/features/transports/api/transports-api-client';
import type { TransportEffectiveCountsDto } from '@custom-school/contracts';

export function CountsUI() {
  const [data, setData] = useState<TransportEffectiveCountsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  const fetchCounts = useCallback(async (date?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await transportsApi.getCounts(date || undefined);
      setData(res);
      if (!selectedDate && res.businessDate) {
        setSelectedDate(res.businessDate);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load transport utilization counts');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    fetchCounts(newDate);
  };

  const handleResetDate = () => {
    setSelectedDate('');
    fetchCounts('');
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Transport & Stoppage Utilization
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            Real-time date-effective distribution of active students across active routes and child stoppages.
          </p>
        </div>

        {/* Date Filter Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
            Effective On:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
          {data?.businessDate && selectedDate !== data.businessDate && (
            <button
              onClick={handleResetDate}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Reset to Today
            </button>
          )}
        </div>
      </div>

      <TransportsNav />

      {error && (
        <div style={{ marginBottom: 20, padding: 12, backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: 6, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && !data ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
          Calculating utilization metrics...
        </div>
      ) : data ? (
        <>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#ffffff', borderRadius: 8, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Active Routes
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
                {data.totalActiveTransports}
              </div>
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4, fontWeight: 500 }}>
                Available for student transit
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Active Stoppages
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>
                {data.totalActiveStoppages}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                Across all active routes
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Effective Students
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb', marginTop: 6 }}>
                {data.totalEffectiveStudents}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                Active students on service date
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Business Date
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 10 }}>
                {data.businessDate}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Asia/Kolkata timezone
              </div>
            </div>
          </div>

          {/* Grouped Breakdown Table */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Route & Stoppage Distribution
              </h2>
              <span style={{ fontSize: 12.5, color: '#64748b' }}>
                Click student count to filter assignments directory
              </span>
            </div>

            {data.transports.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                No transport routes found.
              </div>
            ) : (
              <div>
                {data.transports.map((route) => (
                  <div key={route.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {/* Route Summary Row */}
                    <div
                      style={{
                        padding: '14px 20px',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2" />
                            <circle cx="7" cy="17" r="2" />
                            <path d="M9 17h6" />
                            <circle cx="17" cy="17" r="2" />
                          </svg>
                        </div>
                        <div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{route.name}</span>{' '}
                          <span style={{ fontSize: 13, color: '#64748b' }}>({route.transportNumber})</span>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                            Vehicle: {route.vehicleNumber || 'Unassigned'} &bull; {route.stoppages.length} stoppages &bull;{' '}
                            <span style={{ fontWeight: 600, color: route.status === 'ACTIVE' ? '#15803d' : '#64748b' }}>{route.status}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Link
                          href={`/operator/transports/assignments?transportId=${route.id}&effectiveNow=true`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            background: '#ffffff',
                            border: '1px solid #bfdbfe',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#1d4ed8',
                            textDecoration: 'none',
                          }}
                        >
                          {route.effectiveStudents} Effective Students &rarr;
                        </Link>
                      </div>
                    </div>

                    {/* Stoppages Sub-Table */}
                    {route.stoppages.length > 0 && (
                      <div style={{ padding: '0 20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                          <thead>
                            <tr style={{ color: '#64748b', fontSize: 12, borderBottom: '1px solid #f1f5f9' }}>
                              <th style={{ padding: '8px 12px', width: 60 }}>Order</th>
                              <th style={{ padding: '8px 12px' }}>Stoppage Name</th>
                              <th style={{ padding: '8px 12px' }}>Status</th>
                              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Effective Students</th>
                            </tr>
                          </thead>
                          <tbody>
                            {route.stoppages.map((stoppage) => (
                              <tr key={stoppage.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>
                                  #{stoppage.sortOrder + 1}
                                </td>
                                <td style={{ padding: '10px 12px', fontWeight: 500, color: '#0f172a' }}>
                                  {stoppage.name}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: stoppage.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                                      color: stoppage.status === 'ACTIVE' ? '#15803d' : '#64748b',
                                    }}
                                  >
                                    {stoppage.status}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  <Link
                                    href={`/operator/transports/assignments?transportId=${route.id}&stoppageId=${stoppage.id}&effectiveNow=true`}
                                    style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: 4,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      background: stoppage.effectiveStudents > 0 ? '#eff6ff' : '#f8fafc',
                                      color: stoppage.effectiveStudents > 0 ? '#1d4ed8' : '#94a3b8',
                                      textDecoration: 'none',
                                      border: stoppage.effectiveStudents > 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                    }}
                                  >
                                    {stoppage.effectiveStudents} students
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
