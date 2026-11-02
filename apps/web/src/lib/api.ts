'use client';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
// Allow time for large, explicitly initiated imports while bounding stalled requests.
const MAX_REQUEST_MS = 120000;
let csrf: string | undefined;
let csrfInFlight: Promise<string> | undefined;

type UserFacingError = Error & {
  userSafe?: boolean;
  status?: number;
  code?: string;
  requestId?: string;
  details?: unknown;
};

const technicalText = /prisma|\$queryRaw|\$executeRaw|\bSQL\b|SQLSTATE|\bP\d{4}\b|\buuid\b|postgres|\bstack\b|\btrace\b|SyntaxError|TypeError|ReferenceError|SELECT\s|INSERT\s|UPDATE\s|DELETE\s|node_modules|\.(ts|js):\d+|\r|\n/i;
const friendlyStatuses: Record<number, string> = {
  400: 'Please check the entered details and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do this.',
  404: 'The requested record could not be found.',
  409: 'The record has changed or already exists. Refresh and try again.',
  410: 'This item is no longer available.',
  413: 'The file is too large. Please select a smaller file.',
  415: 'This file type is not supported.',
  422: 'Please check the highlighted fields and try again.',
  423: 'This account or record is temporarily locked.',
  429: 'Too many attempts. Please try again shortly.',
};
const knownFields: Record<string, string> = {
  email: 'Email', fullName: 'Full name', password: 'Password', newPassword: 'New password',
  phone: 'Mobile number', mobile: 'Mobile number', studentId: 'Student',
  schoolId: 'School', classId: 'Class', sectionId: 'Section', role: 'Role',
  academicSessionId: 'Academic year', amount: 'Amount', paymentDate: 'Payment date',
  dueId: 'Fee', feeMonth: 'Fee month', transportId: 'Transport route',
  stoppageId: 'Stoppage', effectiveFrom: 'Effective date', reference: 'Reference',
  name: 'Name', reason: 'Reason', dateOfBirth: 'Date of birth',
};
function safeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s && s.length <= 240 && !technicalText.test(s) ? s : null;
}
function userError(message: string, attrs: Partial<UserFacingError> = {}): UserFacingError {
  const e = new Error(message) as UserFacingError;
  e.userSafe = true;
  Object.assign(e, attrs);
  return e;
}
export function getUserErrorMessage(err: unknown, fallback = 'Unable to complete the request. Please try again.'): string {
  const e = err as UserFacingError | null;
  return e?.userSafe && safeText(e.message) ? e.message : fallback;
}
function readableFieldName(value: unknown): string {
  if (typeof value !== 'string') return 'Input';
  const key = value.split('.').filter(Boolean).filter(v => !/^\d+$/.test(v)).pop() || '';
  return knownFields[key] ||
    (/^[a-zA-Z_]{1,40}$/.test(key)
      ? key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase())
      : 'Input');
}

/** Shared for ordinary JSON calls and binary downloads; never forwards arbitrary server text. */
export function apiResponseError(response: Response, body: any): UserFacingError {
  const status = response.status;
  const fallback = friendlyStatuses[status] || 'Something went wrong. Please try again.';
  const requestId = /^[A-Za-z0-9._-]{8,64}$/.test(String(body?.requestId || ''))
    ? String(body.requestId)
    : (/^[A-Za-z0-9._-]{8,64}$/.test(response.headers.get('X-Request-Id') || '')
        ? response.headers.get('X-Request-Id')! : undefined);
  const code = /^ERR_[A-Z0-9_]{2,80}$/.test(String(body?.code || ''))
    ? body.code : 'ERR_REQUEST';
  let message = status >= 500 ? 'Something went wrong. Please try again.' : safeText(body?.message) || fallback;
  if (status === 422 && Array.isArray(body?.details) && body.details.length > 0) {
    const fields = body.details.slice(0, 3).map((d: any) => {
      if (!d || typeof d !== 'object') return null;
      const field = readableFieldName(d.field || d.path);
      const issue = safeText(d.message) || 'Please enter a valid value.';
      return field + ': ' + issue;
    }).filter(Boolean);
    if (fields.length > 0) message = fields.join(' ');
  }
  if (status >= 500 && requestId) message += ' If it continues, contact support. Reference: ' + requestId;
  return userError(message, { status, code, requestId, details: body?.details });
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const originalSignal = init.signal;
  const forwardAbort = () => controller.abort();
  if (originalSignal?.aborted) controller.abort();
  originalSignal?.addEventListener('abort', forwardAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), MAX_REQUEST_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, credentials: 'include', cache: 'no-store' });
  } catch {
    if (controller.signal.aborted) {
      throw userError('The request took too long. Please check whether your action was saved before trying again.', {
        code: 'ERR_TIMEOUT',
      });
    }
    throw userError('Unable to connect. Check your internet connection and try again.', {
      code: 'ERR_NETWORK',
    });
  } finally {
    clearTimeout(timeout);
    originalSignal?.removeEventListener('abort', forwardAbort);
  }
}

export async function getCsrf(force = false): Promise<string> {
  if (force) csrf = undefined;
  if (csrf && !force) return csrf;
  if (!csrfInFlight) {
    csrfInFlight = (async () => {
      const response = await request(API_BASE + '/security/csrf', {});
      if (!response.ok) throw apiResponseError(response, await response.json().catch(() => ({})));
      const body = await response.json().catch(() => ({}));
      if (typeof body.csrfToken !== 'string' || !body.csrfToken) {
        throw userError('Unable to verify your session. Please reload the page and try again.');
      }
      csrf = body.csrfToken;
      return csrf;
    })().finally(() => { csrfInFlight = undefined; });
  }
  return csrfInFlight;
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
  let response = await request(API_BASE + path, { ...init, headers });
  if (allowCsrfRetry && response.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const body = await response.clone().json().catch(() => ({}));
    if (body?.code === 'ERR_CSRF') {
      headers.set('X-CSRF-Token', await getCsrf(true));
      response = await request(API_BASE + path, { ...init, headers });
    }
  }
  return response;
}
export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await execute(path, init, true);
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const isLoginCall = path.includes('/auth/login');
    if (response.status === 401 && !isLoginCall && typeof window !== 'undefined') {
      window.location.assign(loginRoute());
    }
    throw apiResponseError(response, body);
  }
  return body as T;
}
export function clearClientSecurityState() {
  csrf = undefined;
  csrfInFlight = undefined;
}
