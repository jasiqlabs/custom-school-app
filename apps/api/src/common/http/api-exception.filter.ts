import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ZodError, type ZodIssue } from 'zod';
import { ApiError } from './api-error';

const internalMessage = 'Something went wrong. Please try again. If the problem continues, contact support with the reference number.';
const technicalText = /prisma|\$queryRaw|\$executeRaw|\bSQL\b|SQLSTATE|\bP\d{4}\b|\buuid\b|\bpostgres|\bstack\b|\btrace\b|\bSyntaxError\b|\bTypeError\b|\bReferenceError\b|\bcolumn\b.*\bdoes not exist|\brelation\b.*\bdoes not exist|\bSELECT\s+.{0,100}\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+\w+\s+SET\b|\bDELETE\s+FROM\b|node_modules|\.(ts|js):\d+|\n|\r/i;
const permittedStatus = new Set([400, 401, 403, 404, 409, 410, 413, 415, 422, 423, 429]);
const fieldLabels: Record<string, string> = {
  email: 'Email', fullName: 'Full name', password: 'Password', newPassword: 'New password',
  confirmPassword: 'Confirm password', phone: 'Mobile number', mobile: 'Mobile number',
  schoolId: 'School', studentId: 'Student', operatorId: 'Operator',
  classId: 'Class', sectionId: 'Section', academicSessionId: 'Academic year',
  transportId: 'Transport route', stoppageId: 'Stoppage', amount: 'Amount',
  paymentDate: 'Payment date', feeMonth: 'Fee month', reference: 'Payment reference',
  effectiveFrom: 'Effective from', validUntil: 'Valid until', dueId: 'Fee',
  admissionDate: 'Admission date', dateOfBirth: 'Date of birth', name: 'Name',
  idempotencyKey: 'Payment request', role: 'Role', reason: 'Reason',
};
const fallbackByStatus: Record<number, string> = {
  400: 'Please check the information entered and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested item was not found or is no longer available.',
  409: 'This information has changed or conflicts with an existing record. Refresh and try again.',
  410: 'This item is no longer available.',
  413: 'The selected file is too large.',
  415: 'This file type is not supported.',
  422: 'Please correct the highlighted fields and try again.',
  423: 'This account or record is temporarily locked.',
  429: 'Too many attempts. Please try again shortly.',
};

function safeMessage(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const message = value.trim();
  return message.length > 0 && message.length <= 240 && !technicalText.test(message)
    ? message : fallback;
}

function fieldLabel(path: Array<string | number>): string {
  const last = [...path].reverse().find(part => typeof part === 'string');
  if (!last) return 'Input';
  return fieldLabels[last] || last.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ').replace(/^./, s => s.toUpperCase()).slice(0, 60);
}

function friendlyIssue(issue: ZodIssue): { path: string; field: string; message: string } {
  const field = fieldLabel(issue.path);
  const path = issue.path.map(String).join('.');
  const text = String(issue.message || '');
  let message = safeMessage(text, 'Please enter a valid value.');
  if (issue.code === 'invalid_type') {
    message = issue.received === 'undefined' || issue.received === 'null'
      ? 'This field is required.' : 'Please enter a valid value.';
  } else if (/invalid (uuid|string|date|enum|type)|required|expected \w+, received/i.test(text)) {
    message = /email/i.test(field) ? 'Please enter a valid email address.' : 'Please enter a valid value.';
  }
  return { path, field, message };
}

/** Only plain business data may leave an error response; never arbitrary exception objects. */
function safeBusinessDetails(value: unknown, code: string, depth = 0): unknown {
  if (depth > 3 || value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return safeMessage(value, '') || undefined;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(v => safeBusinessDetails(v, code, depth + 1))
      .filter(v => v !== undefined);
  }
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return undefined;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 25)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,50}$/.test(key) ||
        /password|secret|authorization|cookie|ciphertext|stack|trace|sql/i.test(key)) continue;
    if (key === 'duplicateConfirmationToken') {
      if (code === 'ERR_SCHOOL_DUPLICATE_CONFIRMATION_REQUIRED' && typeof entry === 'string' &&
          entry.length <= 2048 && /^[A-Za-z0-9._-]+$/.test(entry)) output[key] = entry;
      continue;
    }
    const safe = safeBusinessDetails(entry, code, depth + 1);
    if (safe !== undefined) output[key] = safe;
  }
  return output;
}

function safeRoute(request: any): string {
  // Never log originalUrl, query strings, cookies, form values or personally identifying paths.
  const route = String(request.route?.path || '/unmatched')
    .split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
  return route.slice(0, 180);
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<any>();
    const request = host.switchToHttp().getRequest<any>();
    const requestId = request.requestId || randomUUID();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'ERR_INTERNAL';
    let message = internalMessage;
    let details: unknown;

    if (exception instanceof ZodError) {
      status = 422;
      code = 'ERR_VALIDATION';
      message = fallbackByStatus[422];
      details = exception.issues.slice(0, 12).map(friendlyIssue);
    } else if (exception instanceof ApiError && permittedStatus.has(exception.getStatus())) {
      status = exception.getStatus();
      code = /^ERR_[A-Z0-9_]{2,80}$/.test(exception.code) ? exception.code : 'ERR_REQUEST';
      message = safeMessage((exception.getResponse() as any)?.message, fallbackByStatus[status]);
      // Preserve only explicitly validated, nested business data (duplicate-school and readiness).
      details = safeBusinessDetails(exception.details, code);
    } else if (exception instanceof HttpException && permittedStatus.has(exception.getStatus())) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      const object = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};
      code = typeof object.code === 'string' && /^ERR_[A-Z0-9_]{2,80}$/.test(object.code)
        ? object.code : 'ERR_HTTP';
      message = safeMessage(object.message || payload, fallbackByStatus[status]);
      // Nest ConflictException({ message, activeAssignmentCount, transportId }) is
      // used by the existing Transport UI. Preserve those safe fields inside details.
      const structured = object.details !== undefined ? object.details :
        Object.fromEntries(Object.entries(object).filter(([key]) =>
          !['message', 'error', 'statusCode', 'code'].includes(key)));
      details = safeBusinessDetails(structured, code);
    } else if (typeof exception === 'object' && exception &&
      (exception as any).name === 'PrismaClientKnownRequestError') {
      const prismaCode = (exception as any).code;
      if (prismaCode === 'P2002') {
        status = 409; code = 'ERR_DUPLICATE';
        message = 'A record with these details already exists. Please check and try again.';
      } else if (prismaCode === 'P2025') {
        status = 404; code = 'ERR_NOT_FOUND';
        message = fallbackByStatus[404];
      } else if (prismaCode === 'P2003') {
        status = 409; code = 'ERR_RECORD_IN_USE';
        message = 'This record is currently in use and cannot be changed.';
      }
    }

    request.errorCode = code;
    // Structured, redacted diagnostics. No SQL, exception.message/stack, request body or secrets.
    if (status >= 500) {
      console.error(JSON.stringify({
        level: 'error', event: 'http.unhandled_exception',
        requestId, method: request.method, route: safeRoute(request),
        statusCode: status, code,
        // Stable Prisma/SQLSTATE identifiers help operators diagnose failures; never log SQL text.
        dbCode: (() => {
          const e = exception as any;
          const value = String(e?.meta?.code || e?.code || '');
          return /^(?:P\d{4}|[0-9A-Z]{5})$/.test(value) ? value : undefined;
        })(),
        errorClass: typeof exception === 'object' && exception !== null
          ? String((exception as any).name || 'Unknown').slice(0, 70) : 'Unknown',
      }));
    }
    response.status(status).json({
      code, message, ...(details === undefined ? {} : { details }), requestId,
    });
  }
}
