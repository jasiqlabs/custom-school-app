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

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrorInfo(null);
    const f = new FormData(e.currentTarget);
    try {
      await api('/platform/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
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
        }}
        onSubmit={submit}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, padding: '4px 0 12px 0' }}>
          <img
            src="/assets/images/get-digital-your-school.png"
            alt="GET DIGITAL YOUR SCHOOL - School ERP Software"
            style={{
              height: 120,
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
            <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.4 }}>
              Sign in to manage schools and official documents.
            </p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            onChange={clearError}
            placeholder="admin@platform.local"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            onChange={clearError}
            placeholder="••••••••••••"
          />
        </div>

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

        <button disabled={busy} className="btn btn-primary" style={{ minHeight: 44, fontSize: 14 }}>
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
