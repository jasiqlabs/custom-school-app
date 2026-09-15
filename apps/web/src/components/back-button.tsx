'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface BackButtonProps {
  variant?: 'navbar' | 'page';
  fallback?: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function BackButton({
  variant = 'navbar',
  fallback,
  label = 'Back',
  className,
  style,
}: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  const getSmartFallback = (): string => {
    if (fallback) return fallback;
    if (!pathname) return '/';

    // Subpages under /admin/schools/[schoolId]/* -> /admin/schools/[schoolId]
    const schoolSubMatch = pathname.match(/^\/admin\/schools\/([^/]+)\/(.+)$/);
    if (schoolSubMatch) {
      return `/admin/schools/${schoolSubMatch[1]}`;
    }

    // School detail /admin/schools/[schoolId] -> /admin/schools
    if (/^\/admin\/schools\/[^/]+$/.test(pathname)) {
      return '/admin/schools';
    }

    // /admin/schools/new -> /admin/schools
    if (pathname === '/admin/schools/new') {
      return '/admin/schools';
    }

    // /admin/schools -> /admin/dashboard
    if (pathname === '/admin/schools') {
      return '/admin/dashboard';
    }

    // /admin/dashboard -> /
    if (pathname === '/admin/dashboard') {
      return '/';
    }

    // Login pages -> /
    if (pathname === '/admin/login' || pathname === '/operator/login') {
      return '/';
    }

    if (pathname === '/operator/forgot-password') {
      return '/operator/login';
    }

    if (pathname === '/operator') {
      return '/';
    }

    return '/';
  };

  const handleBack = () => {
    const targetFallback = getSmartFallback();

    if (
      typeof window !== 'undefined' &&
      (window.history.state?.idx > 0 ||
        (window.history.length > 1 &&
          document.referrer &&
          document.referrer.startsWith(window.location.origin)))
    ) {
      window.history.back();
    } else {
      router.push(targetFallback);
    }
  };

  const isNavbar = variant === 'navbar';

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      aria-label={`Go back${label ? ` (${label})` : ''}`}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: 600,
        background: isNavbar ? 'rgba(255, 255, 255, 0.12)' : '#f1f5f9',
        color: isNavbar ? '#f8fafc' : '#334155',
        border: isNavbar ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid #cbd5e1',
        borderRadius: 6,
        cursor: 'pointer',
        lineHeight: 1.2,
        transition: 'all 0.15s ease',
        ...style,
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
