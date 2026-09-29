'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function TransportsNav() {
  const pathname = usePathname();
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  const tabs = [
    { name: 'Routes & Stoppages', href: '/operator/transports', exact: true },
    { name: 'Student Assignments', href: '/operator/transports/assignments', exact: false },
    { name: 'Utilization & Counts', href: '/operator/transports/counts', exact: false },
  ];

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
    <div style={{ marginBottom: 24, borderBottom: '1px solid #e2e8f0', background: '#ffffff', borderRadius: 8, padding: '0 16px' }}>
      <nav
        style={{
          display: 'flex',
          gap: 24,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        aria-label="Transport management sections"
      >
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              ref={isActive ? activeTabRef : undefined}
              href={tab.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 4px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2563eb' : '#64748b',
                textDecoration: 'none',
                borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
