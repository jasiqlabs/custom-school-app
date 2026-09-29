'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { WidgetCard } from './widget-card';
import { dashboardApi } from '../api/dashboard-api-client';
import type {
  FeeCollectionDto,
  FeeDuesDto,
  FeeChartDto,
  WidgetResponse,
} from '@custom-school/contracts';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}

export function FeeSummaryWidget() {
  const [periodPreset, setPeriodPreset] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [duesMonth, setDuesMonth] = useState<string>(getCurrentMonthString());
  const [showTable, setShowTable] = useState(false);

  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>(() => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      from: firstOfMonth.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
    };
  });

  const [collectionRes, setCollectionRes] = useState<WidgetResponse<FeeCollectionDto> | null>(null);
  const [duesRes, setDuesRes] = useState<WidgetResponse<FeeDuesDto> | null>(null);
  const [chartRes, setChartRes] = useState<WidgetResponse<FeeChartDto> | null>(null);
  const [loading, setLoading] = useState(true);

  const handlePresetChange = (preset: 'today' | 'week' | 'month' | 'custom') => {
    setPeriodPreset(preset);
    const today = new Date();
    const to = today.toISOString().slice(0, 10);

    if (preset === 'today') {
      setDateRange({ from: to, to });
      setChartPeriod('day');
    } else if (preset === 'week') {
      const past = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      setDateRange({ from: past.toISOString().slice(0, 10), to });
      setChartPeriod('day');
    } else if (preset === 'month') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateRange({ from: firstOfMonth.toISOString().slice(0, 10), to });
      setChartPeriod('day');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [col, dues, chart] = await Promise.all([
        dashboardApi.getFeeCollection({ from: dateRange.from, to: dateRange.to }).catch((err) => ({
          availability: 'UNAVAILABLE' as const,
          generatedAt: new Date().toISOString(),
          reason: err.message,
        })),
        dashboardApi.getFeeDues({ feeMonth: duesMonth }).catch((err) => ({
          availability: 'UNAVAILABLE' as const,
          generatedAt: new Date().toISOString(),
          reason: err.message,
        })),
        dashboardApi.getFeeChart(chartPeriod, { from: dateRange.from, to: dateRange.to }).catch((err) => ({
          availability: 'UNAVAILABLE' as const,
          generatedAt: new Date().toISOString(),
          reason: err.message,
        })),
      ]);
      setCollectionRes(col);
      setDuesRes(dues);
      setChartRes(chart);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to, duesMonth, chartPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availability =
    collectionRes?.availability === 'AVAILABLE' || duesRes?.availability === 'AVAILABLE'
      ? 'AVAILABLE'
      : 'UNAVAILABLE';
  const reason = collectionRes?.reason || duesRes?.reason || chartRes?.reason;
  const generatedAt = collectionRes?.generatedAt || duesRes?.generatedAt;

  const totalCollected = collectionRes?.data?.totalCollected ?? 0;
  const totalDues = duesRes?.data?.totalOutstanding ?? 0;
  const buckets = chartRes?.data?.buckets ?? [];

  const maxBucketAmount = useMemo(() => {
    return Math.max(...buckets.map((b) => b.amount), 1);
  }, [buckets]);

  return (
    <WidgetCard
      title="Fee Collections & Outstanding Dues"
      subtitle="Authoritative financial metrics from Fee Management (MOD-004)"
      availability={availability}
      reason={reason}
      generatedAt={generatedAt}
      loading={loading}
      onRefresh={fetchData}
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      }
      actions={
        <Link
          href="/operator/fees"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#2563eb',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>Fee Portal</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Controls Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 12,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginRight: 4 }}>Period:</span>
            {(['today', 'week', 'month', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                style={{
                  border: '1px solid',
                  borderColor: periodPreset === p ? '#2563eb' : '#cbd5e1',
                  background: periodPreset === p ? '#2563eb' : '#ffffff',
                  color: periodPreset === p ? '#ffffff' : '#334155',
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers or Dues Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {periodPreset === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="date"
                  value={dateRange.from || ''}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                  }}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>to</span>
                <input
                  type="date"
                  value={dateRange.to || ''}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Dues Month:</span>
              <input
                type="month"
                value={duesMonth}
                onChange={(e) => setDuesMonth(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                }}
              />
            </div>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {/* Collected Fees */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: 14,
              background: 'linear-gradient(145deg, #f0fdf4, #ffffff)',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>
                Non-Voided Collections
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: '#dcfce7',
                  color: '#15803d',
                }}
              >
                {dateRange.from && dateRange.to ? `${dateRange.from} to ${dateRange.to}` : 'All time'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#14532d', letterSpacing: '-0.02em' }}>
                {formatCurrency(totalCollected)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Link
                href="/operator/fees"
                style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', textDecoration: 'none' }}
              >
                View payment receipts &rarr;
              </Link>
              <Link
                href="/operator/fees/collect"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#ffffff',
                  background: '#16a34a',
                  padding: '4px 10px',
                  borderRadius: 6,
                  textDecoration: 'none',
                }}
              >
                Collect Fee
              </Link>
            </div>
          </div>

          {/* Outstanding Dues */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: 14,
              background: 'linear-gradient(145deg, #fffbeb, #ffffff)',
              border: '1px solid #fde68a',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                Net Outstanding Dues
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: '#fef3c7',
                  color: '#b45309',
                }}
              >
                Month: {duesMonth}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#78350f', letterSpacing: '-0.02em' }}>
                {formatCurrency(totalDues)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Link
                href={`/operator/fees/pending?month=${duesMonth}`}
                style={{ fontSize: 11, fontWeight: 600, color: '#d97706', textDecoration: 'none' }}
              >
                Open pending report &rarr;
              </Link>
              <span style={{ fontSize: 11, color: '#92400e' }}>Active students only</span>
            </div>
          </div>
        </div>

        {/* Collection Trend Chart & Table */}
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Chart Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Collection Distribution & Velocity
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b' }}>
                Evaluated under Asia/Kolkata business date boundaries
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Period selection */}
              <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {(['day', 'week', 'month'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    style={{
                      border: 'none',
                      background: chartPeriod === period ? '#f1f5f9' : '#ffffff',
                      color: chartPeriod === period ? '#0f172a' : '#64748b',
                      fontWeight: chartPeriod === period ? 700 : 500,
                      padding: '4px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>

              {/* Accessible View Toggle */}
              <button
                onClick={() => setShowTable(!showTable)}
                style={{
                  border: '1px solid #e2e8f0',
                  background: showTable ? '#2563eb' : '#ffffff',
                  color: showTable ? '#ffffff' : '#475569',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
                aria-pressed={showTable}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h18v18H3z" />
                  <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                </svg>
                <span>{showTable ? 'View Chart' : 'View Data Table'}</span>
              </button>
            </div>
          </div>

          {/* Chart or Table Presentation */}
          {buckets.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              No collections recorded in this date range (True Zero: ₹0).
            </div>
          ) : showTable ? (
            /* Accessible Table View (WCAG / DLD spec compliance) */
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 700 }}>Bucket ({chartPeriod})</th>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Collected Amount</th>
                    <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => (
                    <tr key={b.bucket} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{b.bucket}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                        {formatCurrency(b.amount)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>
                        {totalCollected > 0 ? `${Math.round((b.amount / totalCollected) * 100)}%` : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Interactive Bar Chart */
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                height: 180,
                padding: '16px 8px 8px 8px',
                background: '#fafbfc',
                borderRadius: 10,
                border: '1px solid #f1f5f9',
                overflowX: 'auto',
              }}
            >
              {buckets.map((b) => {
                const heightPercent = Math.max(Math.round((b.amount / maxBucketAmount) * 100), 4);
                return (
                  <div
                    key={b.bucket}
                    style={{
                      flex: 1,
                      minWidth: 32,
                      maxWidth: 64,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: '#15803d',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {b.amount > 0 ? (b.amount >= 1000 ? `₹${Math.round(b.amount / 1000)}k` : `₹${b.amount}`) : ''}
                    </span>

                    <div
                      style={{
                        width: '100%',
                        height: `${heightPercent}%`,
                        background: 'linear-gradient(to top, #16a34a, #4ade80)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                        cursor: 'pointer',
                      }}
                      title={`${b.bucket}: ${formatCurrency(b.amount)}`}
                    />

                    <span
                      style={{
                        fontSize: 9,
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        transform: buckets.length > 10 ? 'rotate(-45deg)' : 'none',
                        transformOrigin: 'top left',
                        marginTop: 4,
                      }}
                    >
                      {chartPeriod === 'day' ? b.bucket.slice(5) : b.bucket}
                    </span>
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
