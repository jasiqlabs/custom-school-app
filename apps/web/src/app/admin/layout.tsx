'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminShellLayout } from '../../features/platform-foundation/components/admin-shell-layout';
import { adminLogout, getStoredAdminToken } from '../../features/platform-admin/api/admin-api-client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setIsAuthenticated(true);
      return;
    }

    const token = getStoredAdminToken();
    if (!token) {
      setIsAuthenticated(false);
      router.replace('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {
      // Ignore
    }
    router.push('/admin/login');
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isAuthenticated === null || !isAuthenticated) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Verifying platform admin session...
      </div>
    );
  }

  return (
    <AdminShellLayout userName="Platform Admin" onLogout={handleLogout}>
      {children}
    </AdminShellLayout>
  );
}
