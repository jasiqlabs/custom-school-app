'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredAdminToken } from '../../features/platform-admin/api/admin-api-client';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredAdminToken();
    if (token) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/admin/login');
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
      Redirecting to Platform Admin...
    </div>
  );
}
