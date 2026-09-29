'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { BackButton } from '@/components/back-button';

export function AdminShell({ children, user }: { children: React.ReactNode; user: any }) {
  const p = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const h = (e: PageTransitionEvent) => {
      if (e.persisted) location.reload();
    };
    addEventListener('pageshow', h);
    return () => removeEventListener('pageshow', h);
  }, []);

  // Close sidebar on mobile route change
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [p]);

  // Close sidebar on ESC key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

  // Check if inside a school view
  const schoolMatch = p.match(/^\/admin\/schools\/([^\/]+)/);
  const currentSchoolId = schoolMatch && schoolMatch[1] !== 'new' ? schoolMatch[1] : null;

  return (
    <div className="app-shell-root">
      {/* Mobile Backdrop Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* 1. Sidebar: starts from the very top of the layout, aligned from the top edge alongside the navbar */}
      <aside
        className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Platform Administration Navigation"
      >
        <div className="app-sidebar-inner">
          {/* Sidebar Header: When collapsed, keep the logo-only button. When expanded, show PLATFORM ADMINISTRATION header with collapse toggle */}
          {sidebarOpen ? (
            <div
              style={{
                padding: '0 16px 0 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
                height: 68,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: '#f8fafc',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  userSelect: 'none',
                }}
              >
                PLATFORM ADMINISTRATION
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="sidebar-toggle-btn"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
                height: 68,
              }}
            >
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="sidebar-toggle-btn"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* Sidebar Nav Items */}
          <nav
            style={{
              padding: sidebarOpen ? '16px 12px' : '16px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              flex: 1,
            }}
          >
            {/* Dynamic School-specific options in the sidebar if in school scope */}
            {currentSchoolId && (
              <div style={{ marginBottom: 8 }}>
                {sidebarOpen && (
                  <div
                    className="sidebar-section-heading"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#38bdf8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '6px 12px 6px',
                    }}
                  >
                    School Dashboard
                  </div>
                )}

                <Link
                  href={`/admin/schools/${currentSchoolId}`}
                  className={`sidebar-link ${p === `/admin/schools/${currentSchoolId}` ? 'active' : ''}`}
                  title="School Overview"
                  aria-label="School Overview"
                  style={{ fontSize: 13 }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>Overview</span>
                </Link>

                <Link
                  href={`/admin/schools/${currentSchoolId}/academics`}
                  className={`sidebar-link ${p.startsWith(`/admin/schools/${currentSchoolId}/academics`) ? 'active' : ''}`}
                  title="Academics"
                  aria-label="Academics"
                  style={{ fontSize: 13 }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <span>Academics</span>
                </Link>

                <Link
                  href={`/admin/schools/${currentSchoolId}/operators`}
                  className={`sidebar-link ${p.startsWith(`/admin/schools/${currentSchoolId}/operators`) ? 'active' : ''}`}
                  title="Operators"
                  aria-label="Operators"
                  style={{ fontSize: 13 }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <span>Operators</span>
                </Link>

                <Link
                  href={`/admin/schools/${currentSchoolId}/transfer-certificate`}
                  className={`sidebar-link ${p.startsWith(`/admin/schools/${currentSchoolId}/transfer-certificate`) ? 'active' : ''}`}
                  title="Transfer Certificates"
                  aria-label="Transfer Certificates"
                  style={{ fontSize: 13 }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>Transfer Certificates</span>
                </Link>

                <div
                  style={{
                    height: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    margin: '10px 4px 6px',
                  }}
                />
              </div>
            )}

            {/* Navigation items: Dashboard, Schools Directory, Students */}
            <Link
              href="/admin/dashboard"
              className={`sidebar-link ${p === '/admin/dashboard' ? 'active' : ''}`}
              title="Dashboard"
              aria-label="Dashboard"
              style={{ fontSize: 13.5 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Dashboard</span>
            </Link>

            <Link
              href="/admin/schools"
              className={`sidebar-link ${p === '/admin/schools' || p === '/admin/schools/new' ? 'active' : ''}`}
              title="Schools Directory"
              aria-label="Schools Directory"
              style={{ fontSize: 13.5 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Schools Directory</span>
            </Link>

            <Link
              href="/admin/students"
              className={`sidebar-link ${p.startsWith('/admin/students') ? 'active' : ''}`}
              title="Students"
              aria-label="Students"
              style={{ fontSize: 13.5 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Students</span>
            </Link>
          </nav>

          {/* Sidebar Footer: Admin profile/user area at the bottom */}
          <div
            className="sidebar-footer"
            style={{
              padding: sidebarOpen ? '14px 16px' : '14px 10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: sidebarOpen ? 'auto' : '100%',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
              }}
              title={fullName}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {initials}
              </div>
              {sidebarOpen && (
                <div style={{ lineHeight: 1.25, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {fullName}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Platform Admin</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Right Pane: Navbar at top, Main Page Content below */}
      <div className="app-right-pane">
        {/* Navbar: fixed/sticky at top, adjusts automatically to sidebar width, never scrolls */}
        <header className="app-topbar-header">
          <div className="navbar-container">
            {/* Left Brand Area */}
            <div className="navbar-brand-wrapper">
              {/* Mobile Sidebar Open Toggle: shown on mobile/tablet when sidebar is hidden */}
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="mobile-sidebar-toggle sidebar-toggle-btn"
                  title="Open sidebar"
                  aria-label="Open sidebar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}

              <BackButton variant="navbar" />

              <Link
                href="/admin/dashboard"
                className="navbar-brand-link"
              >
                <img
                  src="/assets/images/get-your-school-log.png"
                  alt="Get Digital Your School"
                  className="navbar-brand-logo"
                />
                <div className="navbar-brand-text">
                  <div className="navbar-brand-title">
                    GET DIGITAL YOUR SCHOOL
                  </div>
                  <div className="navbar-brand-subtitle">
                    School ERP Software
                  </div>
                </div>
              </Link>
            </div>

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

        {/* Main Content Area: Independent vertical scroll, reflows beside sidebar */}
        <main className="app-main-content">
          <div className="app-main-content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function OperatorShell({ children, session }: { children: React.ReactNode; session: any }) {
  const p = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const h = (e: PageTransitionEvent) => {
      if (e.persisted) location.reload();
    };
    addEventListener('pageshow', h);
    return () => removeEventListener('pageshow', h);
  }, []);

  // Close sidebar on mobile route change
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [p]);

  // Close sidebar on ESC key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

  return (
    <div className="app-shell-root">
      {/* Mobile Backdrop Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* 1. Sidebar: starts from the very top of the layout, aligned from the top edge alongside the navbar */}
      <aside
        className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="School Operator Navigation"
      >
        <div className="app-sidebar-inner">
          {/* Sidebar Header: When collapsed, show expand button. When expanded, show SCHOOL OPERATOR header with collapse toggle */}
          {sidebarOpen ? (
            <div
              style={{
                padding: '0 16px 0 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
                height: 68,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: '#f8fafc',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  userSelect: 'none',
                }}
              >
                SCHOOL OPERATOR
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="sidebar-toggle-btn"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: '12px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexShrink: 0,
                height: 68,
              }}
            >
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="sidebar-toggle-btn"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* Sidebar Nav Items */}
          <nav
            style={{
              padding: sidebarOpen ? '16px 12px' : '16px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              flex: 1,
            }}
          >
            {/* Dynamic Active School / Tenant section indicator when expanded */}
            {session?.school?.name && sidebarOpen && (
              <div style={{ marginBottom: 8, padding: '0 4px' }}>
                <div
                  className="sidebar-section-heading"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#38bdf8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 8px 6px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={session.school.name}
                >
                  {session.school.name}
                </div>
                <div
                  style={{
                    height: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    margin: '4px 4px 8px',
                  }}
                />
              </div>
            )}

            {/* Operator Navigation items: Dashboard, Students */}
            <Link
              href="/operator"
              className={`sidebar-link ${p === '/operator' ? 'active' : ''}`}
              title="Dashboard"
              aria-label="Dashboard"
              style={{ fontSize: 13.5 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Dashboard</span>
            </Link>

            <Link
              href="/operator/students"
              className={`sidebar-link ${p.startsWith('/operator/students') ? 'active' : ''}`}
              title="Students"
              aria-label="Students"
              style={{ fontSize: 13.5 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Students</span>
            </Link>

            <Link
              href="/operator/fees/collect"
              className={`sidebar-link ${p.startsWith('/operator/fees') ? 'active' : ''}`}
              title="Fees"
              aria-label="Fees"
              style={{ fontSize: 13.5 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <path d="M6 15h2v2H6z" />
              </svg>
              <span>Fees</span>
            </Link>

            <Link
              href="/operator/transports"
              className={`sidebar-link ${p.startsWith('/operator/transports') ? 'active' : ''}`}
              title="Transport"
              aria-label="Transport"
              style={{ fontSize: 13.5 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
              <span>Transport</span>
            </Link>
          </nav>

          {/* Sidebar Footer: Operator profile/user area at the bottom */}
          <div
            className="sidebar-footer"
            style={{
              padding: sidebarOpen ? '14px 16px' : '14px 10px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: sidebarOpen ? 'auto' : '100%',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
              }}
              title={operatorName}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {initials}
              </div>
              {sidebarOpen && (
                <div style={{ lineHeight: 1.25, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {operatorName}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>School Operator</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Right Pane: Navbar at top, Main Page Content below */}
      <div className="app-right-pane">
        {/* Navbar: fixed/sticky at top, adjusts automatically to sidebar width, never scrolls */}
        <header className="app-topbar-header">
          <div className="navbar-container">
            {/* Left Brand Area */}
            <div className="navbar-brand-wrapper">
              {/* Mobile Sidebar Open Toggle: shown on mobile/tablet when sidebar is hidden */}
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="mobile-sidebar-toggle sidebar-toggle-btn"
                  title="Open sidebar"
                  aria-label="Open sidebar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}

              <BackButton variant="navbar" />

              <Link
                href="/operator"
                className="navbar-brand-link"
              >
                <img
                  src="/assets/images/get-your-school-log.png"
                  alt="Get Digital Your School"
                  className="navbar-brand-logo"
                />
                <div className="navbar-brand-text">
                  <div className="navbar-brand-title">
                    GET DIGITAL YOUR SCHOOL
                  </div>
                  <div className="navbar-brand-subtitle">
                    School ERP Software
                  </div>
                </div>
              </Link>

              {/* Dynamic School Context Badge */}
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

        {/* Main Content Area: Independent vertical scroll, reflows beside sidebar */}
        <main className="app-main-content">
          <div className="app-main-content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
