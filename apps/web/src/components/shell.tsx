'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BackButton } from '@/components/back-button';

export function AdminShell({ children, user }: { children: React.ReactNode; user: any }) {
  const p = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const h = (e: PageTransitionEvent) => {
      if (e.persisted) location.reload();
    };
    addEventListener('pageshow', h);
    return () => removeEventListener('pageshow', h);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api('/platform/auth/logout', { method: 'POST' });
    } catch (e) {
      // redirect anyway
    } finally {
      location.assign('/admin/login');
    }
  }

  // Derive initials for avatar
  const rawName = user?.fullName;
  const fullName = (!rawName || rawName === 'Custom School Administrator') ? 'Platform Administrator' : rawName;
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('') || 'PA';

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      name: 'Schools',
      href: '/admin/schools',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(120% 550px at 50% 0px, rgba(224, 238, 254, 0.65) 0%, rgba(241, 247, 255, 0.35) 45%, transparent 100%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      <header
        style={{
          background: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="navbar-container">
          {/* Left Brand Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BackButton variant="navbar" />
            <Link
              href="/admin/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <img
                src="/assets/images/get-your-school-log.png"
                alt="Get Digital Your School"
                style={{
                  height: 48,
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  flexShrink: 0,
                }}
              />
              <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.25 }}>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>
                  GET DIGITAL YOUR SCHOOL
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8', letterSpacing: '0.01em' }}>
                  School ERP Software
                </div>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {navItems.map((item) => {
              const active = p.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.name}
                  aria-label={item.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    background: active ? '#2563eb' : 'transparent',
                    color: active ? '#ffffff' : '#94a3b8',
                    boxShadow: active ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
                  }}
                >
                  {item.icon}
                  <span className="desktop-only">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right User & Actions Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Notification Bell */}
            <div
              className="desktop-only"
              aria-label="Notifications"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#ef4444',
                }}
              />
            </div>

            {/* Admin User Profile */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.5px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {initials}
              </div>
              <div className="desktop-only" style={{ lineHeight: 1.25 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                  {fullName}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Platform Admin
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              className="btn"
              disabled={loggingOut}
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 7,
                background: 'rgba(255,255,255,0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: loggingOut ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                e.currentTarget.style.color = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
            >
              <span className="desktop-only">{loggingOut ? 'Logging out…' : 'Logout'}</span>
              <span className="mobile-only">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export function OperatorShell({ children, session }: { children: React.ReactNode; session: any }) {
  const p = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const h = (e: PageTransitionEvent) => {
      if (e.persisted) location.reload();
    };
    addEventListener('pageshow', h);
    return () => removeEventListener('pageshow', h);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api('/operator/auth/logout', { method: 'POST' });
    } catch (e) {
      // redirect anyway
    } finally {
      location.assign('/operator/login');
    }
  }

  // Derive operator initials
  const operatorName = session?.operator?.fullName || 'School Operator';
  const initials = operatorName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('') || 'SO';

  const navItems = [
    {
      name: 'Dashboard',
      href: '/operator',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(120% 550px at 50% 0px, rgba(224, 238, 254, 0.65) 0%, rgba(241, 247, 255, 0.35) 45%, transparent 100%), linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      <header
        style={{
          background: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="navbar-container">
          {/* Left Brand Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BackButton variant="navbar" />
            <Link
              href="/operator"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <img
                src="/assets/images/get-your-school-log.png"
                alt="Get Digital Your School"
                style={{
                  height: 48,
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  flexShrink: 0,
                }}
              />
              <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.25 }}>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>
                  GET DIGITAL YOUR SCHOOL
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8', letterSpacing: '0.01em' }}>
                  School ERP Software
                </div>
              </div>
            </Link>

            {/* School Context Badge */}
            {session?.school?.name && (
              <div
                className="desktop-only"
                title={`Active School: ${session.school.name}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '5px 12px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginLeft: 4,
                  maxWidth: 240,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.school.name}
                </span>
              </div>
            )}
          </div>

          {/* Center Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {navItems.map((item) => {
              const active = p === item.href || (item.href !== '/operator' && p.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.name}
                  aria-label={item.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    background: active ? '#2563eb' : 'transparent',
                    color: active ? '#ffffff' : '#94a3b8',
                    boxShadow: active ? '0 2px 8px rgba(37,99,235,0.35)' : 'none',
                  }}
                >
                  {item.icon}
                  <span className="desktop-only">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right User & Actions Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Notification Bell */}
            <div
              className="desktop-only"
              aria-label="Notifications"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>

            {/* Operator User Profile */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.5px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {initials}
              </div>
              <div className="desktop-only" style={{ lineHeight: 1.25 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                  {operatorName}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  School Operator
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              className="btn"
              disabled={loggingOut}
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 7,
                background: 'rgba(255,255,255,0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: loggingOut ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                e.currentTarget.style.color = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
            >
              <span className="desktop-only">{loggingOut ? 'Logging out…' : 'Logout'}</span>
              <span className="mobile-only">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
