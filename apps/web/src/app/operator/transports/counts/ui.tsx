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

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRouteIds, setExpandedRouteIds] = useState<Set<string>>(new Set());

  const toggleRoute = (routeId: string) => {
    setExpandedRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  };

  const expandAll = (routes: Array<{ id: string }>) => {
    setExpandedRouteIds(new Set(routes.map((r) => r.id)));
  };

  const collapseAll = () => {
    setExpandedRouteIds(new Set());
  };

  const filteredTransports = (data?.transports || []).filter((route) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = route.name.toLowerCase().includes(q);
    const numMatch = route.transportNumber.toLowerCase().includes(q);
    const vehicleMatch = (route.vehicleNumber || '').toLowerCase().includes(q);
    const stoppageMatch = route.stoppages.some((s) => s.name.toLowerCase().includes(q));
    return nameMatch || numMatch || vehicleMatch || stoppageMatch;
  });

  const isRouteExpanded = (routeId: string) => {
    if (searchQuery.trim().length > 0) return true;
    return expandedRouteIds.has(routeId);
  };

  return (
    <div className="operator-container" style={{ width: '100%', paddingBottom: 32 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
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
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Route & Stoppage Distribution ({data.transports.length})
                </h2>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  Click a route to open/hide its stoppages &bull; Click student count to filter assignments
                </span>
              </div>

              {/* Search Bar & Quick Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search routes or stoppages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '7px 12px 7px 32px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      width: 250,
                      outline: 'none',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: 8,
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

                {filteredTransports.length > 0 && !searchQuery && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => expandAll(filteredTransports)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={collapseAll}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Collapse All
                    </button>
                  </div>
                )}
              </div>
            </div>

            {data.transports.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                No transport routes found.
              </div>
            ) : filteredTransports.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                No routes or stoppages match &quot;{searchQuery}&quot;.
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {filteredTransports.map((route) => {
                  const isExpanded = isRouteExpanded(route.id);
                  const q = searchQuery.toLowerCase().trim();

                  return (
                    <div key={route.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {/* Route Summary Row (Clickable to open/hide stoppages) */}
                      <div
                        onClick={() => toggleRoute(route.id)}
                        style={{
                          padding: '14px 20px',
                          background: isExpanded ? '#f1f5f9' : '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Dropdown Chevron Button */}
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 4,
                              background: isExpanded ? '#e2e8f0' : '#ffffff',
                              border: '1px solid #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#475569',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              flexShrink: 0,
                            }}
                            title={isExpanded ? 'Click to hide stoppages' : 'Click to view stoppages'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </div>

                          {/* Transport Icon */}
                          <div style={{ width: 34, height: 34, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2" />
                              <circle cx="7" cy="17" r="2" />
                              <path d="M9 17h6" />
                              <circle cx="17" cy="17" r="2" />
                            </svg>
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{route.name}</span>{' '}
                              <span style={{ fontSize: 13, color: '#64748b' }}>({route.transportNumber})</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                              Vehicle: {route.vehicleNumber || 'Unassigned'} &bull;{' '}
                              <span style={{ color: '#2563eb', fontWeight: 600 }}>
                                {route.stoppages.length} {route.stoppages.length === 1 ? 'stoppage' : 'stoppages'} ({isExpanded ? 'Click to hide' : 'Click to show'})
                              </span>{' '}
                              &bull;{' '}
                              <span style={{ fontWeight: 600, color: route.status === 'ACTIVE' ? '#15803d' : '#64748b' }}>{route.status}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: Effective Students link (stop propagation so clicking link doesn't toggle accordion) */}
                        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          >
                            {route.effectiveStudents} Effective Students &rarr;
                          </Link>
                        </div>
                      </div>

                      {/* Stoppages Sub-Table (Shown when route is expanded) */}
                      {isExpanded && route.stoppages.length > 0 && (
                        <div style={{ padding: '4px 20px 14px 20px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead>
                              <tr style={{ color: '#64748b', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '8px 12px', width: 60 }}>Order</th>
                                <th style={{ padding: '8px 12px' }}>Stoppage Name</th>
                                <th style={{ padding: '8px 12px' }}>Status</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Effective Students</th>
                              </tr>
                            </thead>
                            <tbody>
                              {route.stoppages.map((stoppage) => {
                                const isStoppageMatch = q && stoppage.name.toLowerCase().includes(q);

                                return (
                                  <tr
                                    key={stoppage.id}
                                    style={{
                                      borderBottom: '1px solid #f8fafc',
                                      background: isStoppageMatch ? '#fefce8' : 'transparent',
                                    }}
                                  >
                                    <td style={{ padding: '10px 12px', color: '#64748b', fontWeight: 600 }}>
                                      #{stoppage.sortOrder + 1}
                                    </td>
                                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#0f172a' }}>
                                      {stoppage.name}
                                      {isStoppageMatch && (
                                        <span style={{ marginLeft: 6, fontSize: 11, background: '#fef08a', color: '#854d0e', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                                          Match
                                        </span>
                                      )}
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
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* If expanded but has no stoppages */}
                      {isExpanded && route.stoppages.length === 0 && (
                        <div style={{ padding: '14px 20px', fontSize: 13, color: '#94a3b8', background: '#fafbfc', borderTop: '1px solid #f1f5f9' }}>
                          No stoppages configured for this route yet.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
