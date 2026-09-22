'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SchoolNav({ schoolId }: { schoolId: string }) {
  const pathname = usePathname();

  const links = [
    { name: 'Overview', href: `/admin/schools/${schoolId}`, exact: true },
    { name: 'Academics', href: `/admin/schools/${schoolId}/academics`, exact: false },
    { name: 'Operators', href: `/admin/schools/${schoolId}/operators`, exact: false },
    { name: 'Transfer Certificates', href: `/admin/schools/${schoolId}/transfer-certificate`, exact: false },
  ];

  return (
    <nav
      className="school-tabs-nav"
      aria-label="School sections"
      style={{
        display: 'flex',
        gap: 32,
        borderBottom: '1px solid #e2e8f0',
        marginBottom: 24,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {links.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`school-tab-item ${isActive ? 'active' : ''}`}
            style={{
              padding: '10px 0 14px 0',
              fontSize: 14,
              fontWeight: isActive ? 700 : 600,
              color: isActive ? '#2563eb' : '#64748b',
              textDecoration: 'none',
              position: 'relative',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s ease',
              display: 'inline-block',
            }}
          >
            {tab.name}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: '#2563eb',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
