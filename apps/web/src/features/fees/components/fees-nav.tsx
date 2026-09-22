'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function FeesNav() {
  const pathname = usePathname();
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  const tabs = [
    { name: 'Collect Fee', href: '/operator/fees/collect' },
    { name: 'Pending Fees', href: '/operator/fees/pending' },
    { name: 'Payment History', href: '/operator/fees/history' },
    { name: 'Fee Setup & Dues', href: '/operator/fees/setup' },
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
