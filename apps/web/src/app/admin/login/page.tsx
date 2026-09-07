import React from 'react';
import { AdminLoginForm } from '../../../features/platform-admin/components/admin-login-form';

export const metadata = {
  title: 'Platform Admin Sign In | Custom School OS',
  description: 'Sign in to the platform administration control plane.',
};

export default function AdminLoginPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        padding: '1.5rem',
      }}
    >
      <AdminLoginForm />
    </main>
  );
}
