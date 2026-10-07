'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PasswordInput } from '@/components/password-input';
import { BackButton } from '@/components/back-button';

interface LoginError {
  title: string;
  message: string;
  isOperatorMismatch?: boolean;
}

export default function AdminLoginForm() {
  const [errorInfo, setErrorInfo] = useState<LoginError | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrorInfo(null);
    try {
      await api('/platform/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      location.assign('/admin/dashboard');
    } catch (x: any) {
      if (x.code === 'ERR_PORTAL_MISMATCH_OPERATOR' || x.message?.includes('School Operator')) {
        setErrorInfo({
          title: 'School Operator Account Detected',
          message: 'This email is registered for a School Operator, not a Platform Admin. Please sign in via the School Operator Login.',
          isOperatorMismatch: true,
        });
      } else if (x.code === 'ERR_ACCOUNT_LOCKED' || x.status === 423) {
        setErrorInfo({
          title: 'Account Temporarily Locked',
          message: 'This account has been temporarily locked due to multiple failed attempts. Please try again in 15 minutes.',
        });
      } else if (x.status === 429) {
        setErrorInfo({
          title: 'Too Many Attempts',
          message: 'Too many requests. Please wait a few moments before trying again.',
        });
      } else if (x.code === 'ERR_CSRF') {
        setErrorInfo({
          title: 'Security Verification Required',
          message: 'CSRF token validation failed. Please refresh the page and try again.',
        });
      } else if (x.message?.includes('Failed to fetch') || !x.status) {
        setErrorInfo({
          title: 'Connection Error',
          message: 'Unable to reach backend server. Please verify the API server is running on port 4000.',
        });
      } else {
        setErrorInfo({
          title: 'Invalid Admin Credentials',
          message: 'Incorrect email or password for Platform Admin. Please verify your credentials and try again.',
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
        background: 'radial-gradient(circle at 50% 15%, #eff6ff 0%, #f8fafc 50%, #f1f5f9 100%)',
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
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              borderRadius: 999,
              padding: '3px 10px',
            }}
          >
            Platform Admin
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
              Platform Admin
            </h1>
            <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.4, color: '#64748b' }}>
              Sign in to manage schools and official documents.
            </p>
          </div>
        </div>

        {/* Quick Demo Credentials Helper */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>Demo Admin: </span>
            <code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: 4, fontSize: 11 }}>admin@example.com</code> &bull; <code style={{ background: '#e2e8f0', padding: '2px 4px', borderRadius: 4, fontSize: 11 }}>AdminPassword123!</code>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmail('admin@example.com');
              setPassword('AdminPassword123!');
              clearError();
            }}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#1d4ed8',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Auto-fill
          </button>
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
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            placeholder="admin@example.com"
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
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
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
                {errorInfo.isOperatorMismatch && (
                  <div style={{ marginTop: 8 }}>
                    <Link
                      href="/operator/login"
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
                      Go to School Operator Login &rarr;
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
          disabled={busy}
          className="btn btn-primary"
          style={{
            width: '100%',
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#1d4ed8',
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
