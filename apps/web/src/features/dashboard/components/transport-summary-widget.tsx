'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { WidgetCard } from './widget-card';
import { dashboardApi } from '../api/dashboard-api-client';
import type { TransportDashboardDto, WidgetResponse } from '@custom-school/contracts';

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransportSummaryWidget() {
  const [businessDate, setBusinessDate] = useState<string>(getTodayString());
  const [transportRes, setTransportRes] = useState<WidgetResponse<TransportDashboardDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getTransport({ businessDate }).catch((err) => ({
        availability: 'UNAVAILABLE' as const,
        generatedAt: new Date().toISOString(),
        reason: err.message,
      }));
      setTransportRes(res);
    } finally {
      setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availability = transportRes?.availability === 'AVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE';
  const reason = transportRes?.reason;
  const generatedAt = transportRes?.generatedAt;

  const data = transportRes?.data;
  const totalTransports = data?.totalActiveTransports ?? 0;
  const totalStoppages = data?.totalActiveStoppages ?? 0;
  const totalEffectiveStudents = data?.totalEffectiveStudents ?? 0;
  const routes = data?.transports ?? [];

  const toggleRoute = (routeId: string) => {
    setExpandedRouteId((prev) => (prev === routeId ? null : routeId));
  };

  return (
    <WidgetCard
      title="Transport & Stoppage Utilization"
      subtitle="Effective active assignments & routes from Transport Management (MOD-005)"
      availability={availability}
      reason={reason}
      generatedAt={generatedAt}
      loading={loading}
      onRefresh={fetchData}
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      }
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>Date:</span>
          <input
            type="date"
            value={businessDate}
            onChange={(e) => setBusinessDate(e.target.value)}
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 11,
            }}
          />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
          {/* Active Routes */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Active Routes</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{totalTransports}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>vehicles</span>
            </div>
            <Link
              href="/operator/transports"
              style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', textDecoration: 'none', marginTop: 4 }}
            >
              Manage routes &rarr;
            </Link>
          </div>

          {/* Active Stoppages */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Active Stoppages</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{totalStoppages}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>pickups</span>
            </div>
            <Link
              href="/operator/transports/counts"
              style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', textDecoration: 'none', marginTop: 4 }}
            >
              View breakdown &rarr;
            </Link>
          </div>

          {/* Effective Students in Transport */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              background: 'linear-gradient(145deg, #eff6ff, #ffffff)',
              border: '1px solid #bfdbfe',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>Effective Riders</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>{totalEffectiveStudents}</span>
              <span style={{ fontSize: 11, color: '#60a5fa' }}>students</span>
            </div>
            <Link
              href="/operator/transports/assignments"
              style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', textDecoration: 'none', marginTop: 4 }}
            >
              Assignment directory &rarr;
            </Link>
          </div>
        </div>

        {/* Route Utilization Breakdown */}
        <div
          style={{
            padding: 18,
            borderRadius: 12,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              Route & Stoppage Occupancy
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Effective on: {businessDate}
            </span>
          </div>

          {routes.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              No active transport routes found for this school.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {routes.map((route) => {
                const isExpanded = expandedRouteId === route.id;
                return (
                  <div
                    key={route.id}
                    style={{
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#fafbfc',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Route summary row */}
                    <div
                      onClick={() => toggleRoute(route.id)}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: isExpanded ? '#f1f5f9' : '#fafbfc',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <div>
                          <strong style={{ fontSize: 13, color: '#0f172a' }}>{route.name}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                              #{route.transportNumber}
                            </span>
                            {route.vehicleNumber && (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                &bull; {route.vehicleNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {route.stoppageCount} stoppages
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: route.effectiveStudents > 0 ? '#dbeafe' : '#f1f5f9',
                            color: route.effectiveStudents > 0 ? '#1d4ed8' : '#64748b',
                          }}
                        >
                          {route.effectiveStudents} riders
                        </span>
                      </div>
                    </div>

                    {/* Stoppage details drawer */}
                    {isExpanded && (
                      <div style={{ padding: '10px 16px 14px 42px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                        {route.stoppages.length === 0 ? (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>No stoppages defined.</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {route.stoppages.map((s, idx) => (
                              <div
                                key={s.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: 12,
                                  padding: '4px 0',
                                  borderBottom: idx < route.stoppages.length - 1 ? '1px dashed #f1f5f9' : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 10, color: '#94a3b8', width: 14 }}>
                                    {s.sortOrder}.
                                  </span>
                                  <span style={{ color: '#334155', fontWeight: 500 }}>
                                    {s.name}
                                  </span>
                                </div>
                                <span style={{ fontWeight: 600, color: s.effectiveStudents > 0 ? '#166534' : '#94a3b8' }}>
                                  {s.effectiveStudents} {s.effectiveStudents === 1 ? 'student' : 'students'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
