'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PasswordInput } from '@/components/password-input';
import { BackButton } from '@/components/back-button';

interface LoginError {
  title: string;
  message: string;
  isAdminMismatch?: boolean;
}

export default function OperatorLoginUi() {
  const [errorInfo, setErrorInfo] = useState<LoginError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrorInfo(null);
    const f = new FormData(e.currentTarget);
    try {
      await api('/operator/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
      });
      location.assign('/operator');
    } catch (e: any) {
      if (e.code === 'ERR_PORTAL_MISMATCH_ADMIN' || e.message?.includes('Platform Admin')) {
        setErrorInfo({
          title: 'Platform Admin Account Detected',
          message: 'This email is registered for a Platform Admin, not a School Operator. Please sign in via the Platform Admin Login.',
          isAdminMismatch: true,
        });
      } else if (e.code === 'ERR_ACCOUNT_INACTIVE' || e.status === 403) {
        setErrorInfo({
          title: 'Account Not Available',
          message: 'This school or operator account is currently inactive. Please contact your Platform Admin.',
        });
      } else if (e.code === 'ERR_ACCOUNT_LOCKED' || e.status === 423) {
        setErrorInfo({
          title: 'Account Temporarily Locked',
          message: 'This account has been temporarily locked due to multiple failed attempts. Please try again in 15 minutes.',
        });
      } else if (e.status === 429) {
        setErrorInfo({
          title: 'Too Many Attempts',
          message: 'Too many requests. Please wait a few moments before trying again.',
        });
      } else {
        setErrorInfo({
          title: 'Invalid Operator Credentials',
          message: 'Incorrect email or password for School Operator. Please verify your credentials or contact your Platform Admin.',
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const clearError = () => {
    if (errorInfo) setErrorInfo(null);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: 'radial-gradient(circle at 50% 15%, #ecfdf5 0%, #f8fafc 50%, #f1f5f9 100%)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <form
        method="POST"
        className="card grid"
        style={{
          maxWidth: 440,
          width: 'min(100%, 440px)',
          boxSizing: 'border-box',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onSubmit={submit}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <BackButton variant="page" fallback="/" />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              borderRadius: 999,
              padding: '3px 10px',
            }}
          >
            School Operator
          </div>
        </div>

        {/* Official Platform Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, padding: '2px 0 8px 0' }}>
          <img
            src="/assets/images/get-digital-your-school.png"
            alt="GET DIGITAL YOUR SCHOOL - School ERP Software"
            style={{
              height: 110,
              maxWidth: '100%',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto',
            }}
          />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              School Operator
            </h1>
            <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.4, color: '#64748b' }}>
              Sign in to your assigned school.
            </p>
          </div>
        </div>

        {/* Email Field */}
        <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <label htmlFor="email" style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            onChange={clearError}
            placeholder="operator@school.local"
            style={{
              width: '100%',
              minHeight: 44,
              boxSizing: 'border-box',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
              backgroundColor: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Password Field */}
        <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <label htmlFor="password" style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            onChange={clearError}
            placeholder="••••••••••••"
            style={{
              width: '100%',
              minHeight: 44,
              boxSizing: 'border-box',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
              backgroundColor: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Error Alert */}
        {errorInfo && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #f87171',
              color: '#991b1b',
              fontSize: 13,
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16, lineHeight: 1.2 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: 13, marginBottom: 2 }}>
                  {errorInfo.title}
                </strong>
                <span style={{ color: '#7f1d1d' }}>{errorInfo.message}</span>
                {errorInfo.isAdminMismatch && (
                  <div style={{ marginTop: 8 }}>
                    <Link
                      href="/admin/login"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#1d4ed8',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        fontSize: 12,
                      }}
                    >
                      Go to Platform Admin Login &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-emerald"
          disabled={busy}
          style={{
            width: '100%',
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#059669',
            color: '#ffffff',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1,
            transition: 'background-color 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'inherit',
            marginTop: 4,
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div style={{ textAlign: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            🔒 GET DIGITAL YOUR SCHOOL &bull; Secure Authentication
          </span>
        </div>
      </form>
    </main>
  );
}
