'use client';

import React from 'react';
import { OperatorShellLayout } from '../../features/platform-foundation/components/operator-shell-layout';

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const handleLogout = () => {
    window.location.href = '/';
  };

  return (
    <OperatorShellLayout
      schoolName="Delhi Public Model Academy"
      userName="Operator Officer"
      academicYear="2026-2027"
      onLogout={handleLogout}
    >
      {children}
    </OperatorShellLayout>
  );
}
