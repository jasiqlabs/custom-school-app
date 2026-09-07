'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '../api/admin-api-client';

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await adminLogin({ email, password });
      setPassword('');
      router.push('/admin/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
      setPassword(''); // Never preserve password on failure
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '420px',
        width: '100%',
        margin: '0 auto',
        padding: '2rem',
        background: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: 0 }}>
          Platform Admin Login
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
          Sign in with your administrator credentials to govern school tenants.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label
            htmlFor="admin-email"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
          >
            Admin Email Address
          </label>
          <input
            id="admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@customschool.com"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.9375rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="admin-password"
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
          >
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '0.9375rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9375rem',
            fontWeight: 500,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s ease-in-out',
          }}
        >
          {isLoading ? 'Authenticating...' : 'Sign In as Platform Admin'}
        </button>
      </form>
    </div>
  );
}
