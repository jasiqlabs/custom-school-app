'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { WidgetCard } from './widget-card';
import { dashboardApi } from '../api/dashboard-api-client';
import type { StudentCountsDto, GenderCountsDto, WidgetResponse } from '@custom-school/contracts';

export function StudentSummaryWidget() {
  const [studentsRes, setStudentsRes] = useState<WidgetResponse<StudentCountsDto> | null>(null);
  const [genderRes, setGenderRes] = useState<WidgetResponse<GenderCountsDto> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [st, gd] = await Promise.all([
        dashboardApi.getStudents().catch((err) => ({
          availability: 'UNAVAILABLE' as const,
          generatedAt: new Date().toISOString(),
          reason: err.message,
        })),
        dashboardApi.getGender().catch((err) => ({
          availability: 'UNAVAILABLE' as const,
          generatedAt: new Date().toISOString(),
          reason: err.message,
        })),
      ]);
      setStudentsRes(st);
      setGenderRes(gd);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availability = studentsRes?.availability === 'AVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE';
  const reason = studentsRes?.reason || genderRes?.reason;
  const generatedAt = studentsRes?.generatedAt;

  const data = studentsRes?.data;
  const gender = genderRes?.data;

  const total = data?.total ?? 0;
  const active = data?.active ?? 0;
  const inactive = data?.inactive ?? 0;

  const boys = gender?.activeBoys ?? 0;
  const girls = gender?.activeGirls ?? 0;
  const totalGender = boys + girls;
  const boysPct = totalGender > 0 ? Math.round((boys / totalGender) * 100) : 50;
  const girlsPct = totalGender > 0 ? 100 - boysPct : 50;

  return (
    <WidgetCard
      title="Student Enrollment & Strength"
      availability={availability}
      reason={reason}
      generatedAt={generatedAt}
      loading={loading}
      onRefresh={fetchData}
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      }
      actions={
        <Link
          href="/operator/students"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#2563eb',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '3px 8px',
            borderRadius: 6,
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            height: 28,
            whiteSpace: 'nowrap',
          }}
        >
          <span>All Students</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      }
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          {/* Total Strength */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Total Registered</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{total}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>records</span>
            </div>
            <Link
              href="/operator/students"
              style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', textDecoration: 'none', marginTop: 2 }}
            >
              Open directory &rarr;
            </Link>
          </div>

          {/* Active Students */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'linear-gradient(145deg, #f0fdf4, #ffffff)',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: '#166534' }}>Active Strength</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{active}</span>
              <span style={{ fontSize: 11, color: '#86efac' }}>active</span>
            </div>
            <Link
              href="/operator/students?status=ACTIVE"
              style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', textDecoration: 'none', marginTop: 2 }}
            >
              Filtered directory &rarr;
            </Link>
          </div>

          {/* Inactive Students */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: inactive > 0 ? '#fffbeb' : '#f8fafc',
              border: `1px solid ${inactive > 0 ? '#fde68a' : '#e2e8f0'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: inactive > 0 ? '#92400e' : '#64748b' }}>Inactive</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: inactive > 0 ? '#b45309' : '#0f172a' }}>{inactive}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>left/tc</span>
            </div>
            <Link
              href="/operator/students?status=INACTIVE"
              style={{ fontSize: 11, fontWeight: 600, color: inactive > 0 ? '#d97706' : '#64748b', textDecoration: 'none', marginTop: 2 }}
            >
              View inactive &rarr;
            </Link>
          </div>
        </div>

        {/* Gender Demographics Card */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 10,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Active Gender Distribution</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>Active enrollment breakdown</span>
          </div>

          {/* Visual Percentage Bar */}
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: '#e2e8f0',
              overflow: 'hidden',
              display: 'flex',
            }}
            role="progressbar"
            aria-valuenow={boysPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Boys ${boysPct}%, Girls ${girlsPct}%`}
          >
            <div
              style={{
                width: `${boysPct}%`,
                background: '#3b82f6',
                transition: 'width 0.3s ease',
              }}
              title={`Boys: ${boys} (${boysPct}%)`}
            />
            <div
              style={{
                width: `${girlsPct}%`,
                background: '#ec4899',
                transition: 'width 0.3s ease',
              }}
              title={`Girls: ${girls} (${girlsPct}%)`}
            />
          </div>

          {/* Gender Clickable Filter Badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Link
              href="/operator/students?gender=BOY&status=ACTIVE"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 6,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6' }} />
              <span>Boys: <strong>{boys}</strong> ({boysPct}%)</span>
              <span style={{ fontSize: 10, color: '#3b82f6' }}>&rsaquo;</span>
            </Link>

            <Link
              href="/operator/students?gender=GIRL&status=ACTIVE"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 6,
                background: '#fdf2f8',
                border: '1px solid #fbcfe8',
                color: '#9d174d',
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ec4899' }} />
              <span>Girls: <strong>{girls}</strong> ({girlsPct}%)</span>
              <span style={{ fontSize: 10, color: '#ec4899' }}>&rsaquo;</span>
            </Link>
          </div>
        </div>

        {/* Quick Action Bar (Bottom pinned) */}
        <div
          style={{
            marginTop: 'auto',
            padding: '10px 14px',
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Looking to register a new student?
          </span>
          <Link
            href="/operator/students/new"
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: 6,
              background: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 28,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Admit Student</span>
          </Link>
        </div>
      </div>
    </WidgetCard>
  );
}
