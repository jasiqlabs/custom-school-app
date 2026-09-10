import { NextRequest, NextResponse } from 'next/server';

const protectedPath = (pathname: string) => {
  if (pathname.startsWith('/admin/login')) return false;
  if (pathname.startsWith('/operator/login') || pathname.startsWith('/operator/forgot-password')) return false;
  return pathname.startsWith('/admin/') || pathname === '/admin' || pathname.startsWith('/operator/') || pathname === '/operator';
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Content-Security-Policy', "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' blob: data:; connect-src 'self' http://localhost:4000 https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'");
  if (protectedPath(request.nextUrl.pathname)) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
