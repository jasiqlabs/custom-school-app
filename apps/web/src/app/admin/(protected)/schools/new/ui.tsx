'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

function SchoolBuildingIcon({ size = 26, color = '#2563eb' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h18" />
      <path d="M5 21V9l7-5 7 5v12" />
      <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
      <circle cx="12" cy="7" r="1" fill={color} />
      <line x1="8" y1="12" x2="8" y2="14" />
      <line x1="16" y1="12" x2="16" y2="14" />
    </svg>
  );
}

export default function NewSchoolUi() {
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState<any>();
  const [pending, setPending] = useState<any>();
  const [busy, setBusy] = useState(false);

  async function create(payload: any) {
    setBusy(true);
    try {
      const s = await api('/platform/schools', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      location.assign(`/admin/schools/${s.id}`);
    } catch (e: any) {
      if (e.code === 'ERR_SCHOOL_DUPLICATE_CONFIRMATION_REQUIRED') {
        setPending(payload);
        setConfirm(e.details);
        return;
      }
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const f = new FormData(e.currentTarget);
    await create({
      name: f.get('name'),
      address: f.get('address') || null,
      phone: f.get('phone') || null,
      email: f.get('email') || null,
    });
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100%',
        paddingBottom: 64,
        overflow: 'hidden',
      }}
    >
      {/* Background Decorative Accents */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          left: -80,
          width: 500,
          height: 400,
          background: 'radial-gradient(ellipse at center, rgba(186, 230, 253, 0.4) 0%, rgba(224, 242, 254, 0.15) 50%, transparent 80%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: -40,
          width: 320,
          height: 480,
          backgroundImage: 'radial-gradient(#93c5fd 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          opacity: 0.3,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="dashboard-content-container"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 860,
          margin: '0 auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
          <Link
            href="/admin/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#2563eb',
              textDecoration: 'none',
            }}
            title="Dashboard"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
          <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
          <Link
            href="/admin/schools"
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Schools
          </Link>
          <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>Add School</span>
        </div>

        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)',
                border: '1px solid #dbeafe',
              }}
            >
              <SchoolBuildingIcon size={26} color="#2563eb" />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.2,
                }}
              >
                Add School
              </h1>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: 14,
                  color: '#64748b',
                }}
              >
                Register a new school tenant on the Get Digital Your School platform.
              </p>
            </div>
          </div>

          {/* Quick Back Button */}
          <Link
            href="/admin/schools"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Directory</span>
          </Link>
        </div>

        {/* Informational Guidance Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#1e3a8a' }}>
            <strong>Lifecycle Notice:</strong> Newly registered schools start in <strong>DRAFT</strong> status. A secure platform UUID (e.g. <code>SCH-XXXXX</code>) will be automatically generated and remains permanent. You can configure branding, principal details, academic classes, and operator access after creating the draft.
          </div>
        </div>

        {/* Error Alert */}
        {err && (
          <div
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 12,
              padding: '14px 18px',
              color: '#991b1b',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>{err}</div>
            <button
              type="button"
              onClick={() => setErr('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#991b1b',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Main Onboarding Form Card */}
        <form
          onSubmit={submit}
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.04)',
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Section: School Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="school-name" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                School Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span style={{ fontSize: 12, color: '#64748b' }}>Required</span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  display: 'flex',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M12 3l9 4H3l9-4z" />
                </svg>
              </div>
              <input
                id="school-name"
                name="name"
                required
                minLength={2}
                placeholder="e.g. Greenfield Public School"
                autoComplete="off"
                style={{
                  width: '100%',
                  height: 46,
                  padding: '10px 14px 10px 42px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 14,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Official registered legal name of the school institution.
            </div>
          </div>

          {/* Section: Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="school-address" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Campus Address
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 14,
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  display: 'flex',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <textarea
                id="school-address"
                name="address"
                rows={3}
                placeholder="e.g. Plot 42, Sector 5, Knowledge Park, New Delhi - 110001"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 14,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Physical campus location (street address, city, state, postal code).
            </div>
          </div>

          {/* Section: Contact Phone & Email Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {/* Phone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="school-phone" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Phone Number
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    display: 'flex',
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <input
                  id="school-phone"
                  name="phone"
                  placeholder="e.g. +91 98765 43210"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    height: 46,
                    padding: '10px 14px 10px 42px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 14,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="school-email" style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Official Email
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    display: 'flex',
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <input
                  id="school-email"
                  name="email"
                  type="email"
                  placeholder="e.g. admin@greenfield.edu"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    height: 46,
                    padding: '10px 14px 10px 42px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 14,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Form Divider & Buttons */}
          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <Link
              href="/admin/schools"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#2563eb',
                color: '#ffffff',
                padding: '11px 24px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!busy) {
                  e.currentTarget.style.background = '#1d4ed8';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(37, 99, 235, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                if (!busy) {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.25)';
                }
              }}
            >
              {busy ? (
                <>
                  <svg
                    style={{
                      animation: 'spin 0.75s linear infinite',
                      width: 16,
                      height: 16,
                    }}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path
                      fill="#ffffff"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  <span>Creating Draft School...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create Draft School</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Duplicate School Warning Dialog */}
        {confirm && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-title"
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderLeft: '5px solid #f59e0b',
              borderRadius: 14,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h2 id="duplicate-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#92400e' }}>
                  Possible Duplicate School Detected
                </h2>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>
                  One or more schools with a similar name already exist on the platform. Review the matching candidates below and confirm only if this is intentionally a separate school tenant.
                </p>
              </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {confirm.candidates?.map((c: any) => (
                <li
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 14px',
                    background: '#ffffff',
                    borderRadius: 8,
                    border: '1px solid #fde68a',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      SC
                    </div>
                    <strong style={{ fontSize: 14, color: '#0f172a' }}>{c.name}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <code
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2563eb',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {c.id}
                    </code>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: c.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9',
                        color: c.status === 'ACTIVE' ? '#047857' : '#475569',
                      }}
                    >
                      {c.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  create({
                    ...pending,
                    duplicateConfirmationToken: confirm.duplicateConfirmationToken,
                  })
                }
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#d97706',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#b45309';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#d97706';
                }}
              >
                {busy ? 'Creating...' : 'Confirm & Create Anyway'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
