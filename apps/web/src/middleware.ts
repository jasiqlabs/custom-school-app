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
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
  const connectSrc = isDev ? "'self' http://localhost:4000 http://localhost:9000 https: ws: wss:" : "'self' http://localhost:4000 https:";
  const imgSrc = isDev ? "'self' blob: data: http://localhost:9000" : "'self' blob: data:";
  response.headers.set('Content-Security-Policy', `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src ${imgSrc}; connect-src ${connectSrc}; style-src 'self' 'unsafe-inline'; script-src ${scriptSrc}`);
  if (protectedPath(request.nextUrl.pathname)) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
