'use client';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
let csrf: string | undefined;

export async function getCsrf(force = false) {
  if (csrf && !force) return csrf;
  const response = await fetch(`${API_BASE}/security/csrf`, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to initialize secure request');
  const body = await response.json();
  csrf = body.csrfToken;
  return csrf!;
}

function loginRoute() {
  if (typeof window === 'undefined') return '/operator/login';
  return window.location.pathname.startsWith('/admin') ? '/admin/login' : '/operator/login';
}

async function execute(path: string, init: RequestInit, allowCsrfRetry: boolean): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers || {});
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-CSRF-Token', await getCsrf());
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }
  let response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' });
  if (allowCsrfRetry && response.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    let body: any = {};
    try { body = await response.clone().json(); } catch {}
    if (body?.code === 'ERR_CSRF') {
      headers.set('X-CSRF-Token', await getCsrf(true));
      response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' });
    }
  }
  return response;
}

export async function api<T = any>(path: string, init: RequestInit = {}) {
  const response = await execute(path, init, true);
  if (response.status === 204) return undefined as T;
  let body: any = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) {
    const isLoginCall = path.includes('/auth/login');
    if (response.status === 401 && !isLoginCall && typeof window !== 'undefined') {
      window.location.assign(loginRoute());
    }
    const detailsMsg = Array.isArray(body.details) && body.details.length > 0
      ? body.details.map((d: any) => d.message || d.path ? `${d.path ? d.path + ': ' : ''}${d.message}` : String(d)).join('. ')
      : null;
    // A stale/older API may still expose a raw Prisma/SQL error in its 5xx body.
    // Do not render internal query text or database identifiers in browser alerts.
    const safeMessage = response.status >= 500
      ? 'Server error. Please retry or contact support with the request ID.'
      : (detailsMsg || body.message || 'Request failed');
    const error = new Error(safeMessage) as any;
    error.code = response.status >= 500 ? 'ERR_INTERNAL' : body.code;
    error.status = response.status;
    error.details = response.status >= 500 ? undefined : body.details;
    error.requestId = body.requestId;
    throw error;
  }
  return body as T;
}

export function clearClientSecurityState() {
  csrf = undefined;
}
