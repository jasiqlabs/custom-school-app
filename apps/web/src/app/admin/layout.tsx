'use client';

import React from 'react';
import { AdminShellLayout } from '../../features/platform-foundation/components/admin-shell-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const handleLogout = () => {
    window.location.href = '/';
  };

  return (
    <AdminShellLayout userName="Platform Admin" onLogout={handleLogout}>
      {children}
    </AdminShellLayout>
  );
}
