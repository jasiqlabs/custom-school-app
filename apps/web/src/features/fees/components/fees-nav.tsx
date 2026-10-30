'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export function FeesNav({ role }: { role?: string } = {}) {
  const pathname = usePathname();
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const [effectiveRole, setEffectiveRole] = useState<string | undefined>(role);

  useEffect(() => {
    if (role) {
      setEffectiveRole(role);
      return;
    }
    api('/operator/auth/session')
      .then((s) => {
        setEffectiveRole(s?.role || s?.operator?.role);
      })
      .catch(() => {});
  }, [role]);

  const isReportViewer = effectiveRole === 'REPORT_VIEWER';
  const tabs = isReportViewer
    ? [
        { name: 'Pending Fees Report', href: '/operator/fees/pending' },
      ]
    : [
        { name: 'Collect Fee', href: '/operator/fees/collect' },
        { name: 'Pending Fees', href: '/operator/fees/pending' },
        { name: 'Payment History', href: '/operator/fees/history' },
        { name: 'Fee Setup & Dues', href: '/operator/fees/setup' },
        { name: 'Opening Balances', href: '/operator/fees/opening-balances' },
        { name: 'Numbering', href: '/operator/fees/numbering' },
      ];

  // Gently ensure active tab is in view on small devices
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [pathname]);

  return (
    <div className="fees-nav-wrapper">
      <nav
        className="fees-tabs-nav"
        aria-label="Fee management sections"
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              ref={isActive ? activeTabRef : undefined}
              href={tab.href}
              className={`fees-tab-item ${isActive ? 'active' : ''}`}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
