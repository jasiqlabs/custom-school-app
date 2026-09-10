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
    if (response.status === 401 && typeof window !== 'undefined') window.location.assign(loginRoute());
    const error = new Error(body.message || 'Request failed') as any;
    error.code = body.code;
    error.status = response.status;
    error.details = body.details;
    throw error;
  }
  return body as T;
}

export function clearClientSecurityState() {
  csrf = undefined;
}
