import { z } from 'zod';

export const feeMonthSchema = z.string().trim().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format');

export const paymentModeSchema = z.enum(['CASH', 'CHEQUE', 'UPI', 'BANK_TRANSFER', 'OTHER']);

export const paymentStatusSchema = z.enum(['ACTIVE', 'VOIDED']);

export const upsertClassFeeConfigSchema = z.object({
  classId: z.string().uuid('Invalid class UUID'),
  effectiveMonth: feeMonthSchema,
  amount: z.coerce.number().positive('Amount must be greater than zero').max(1000000, 'Amount cannot exceed 1,000,000'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const generateDuesSchema = z.object({
  feeMonth: feeMonthSchema,
  classId: z.string().uuid('Invalid class UUID').optional(),
});

export const paymentAllocationSchema = z.object({
  chargeId: z.string().uuid('Invalid charge UUID'),
  amount: z.coerce.number().positive('Allocation amount must be greater than zero'),
});

export const collectPaymentSchema = z.object({
  studentId: z.string().uuid('Invalid student UUID'),
  dueId: z.string().uuid('Invalid due UUID').optional(),
  allocations: z.array(paymentAllocationSchema).optional(),
  amount: z.coerce.number().positive('Payment amount must be greater than zero').max(10000000, 'Payment amount too large'),
  mode: paymentModeSchema.default('CASH'),
  paymentDate: z.string().trim().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/, 'Date must be in YYYY-MM-DD format'),
  reference: z.string().trim().max(128).optional().nullable(),
  idempotencyKey: z.string().trim().min(8, 'Idempotency key must have at least 8 characters').max(128),
}).refine((data) => {
  return !!data.dueId || (Array.isArray(data.allocations) && data.allocations.length > 0);
}, {
  message: 'Either dueId or at least one charge allocation must be provided',
  path: ['allocations'],
});

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(3, 'Mandatory void reason must be at least 3 characters').max(500, 'Void reason too long'),
});

export const feePaymentFilterSchema = z.object({
  studentId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  feeMonth: feeMonthSchema.optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid fromDate format').optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid toDate format').optional(),
  mode: paymentModeSchema.optional(),
  status: paymentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const pendingFeeFilterSchema = z.object({
  feeMonth: feeMonthSchema,
  classId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createPendingFeeExportSchema = z.object({
  feeMonth: feeMonthSchema,
  classId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
});

export const chargeKindSchema = z.enum(['ONE_TIME', 'RECURRING', 'EVENT', 'MANUAL']);
export const recurrencePolicySchema = z.enum(['MONTHLY', 'ANNUAL', 'TERM', 'ONE_TIME']);

export const createFeeCategorySchema = z.object({
  code: z.string().trim().min(2, 'Code must have at least 2 characters').max(32, 'Code cannot exceed 32 characters').regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores').transform((v) => v.toUpperCase()),
  displayName: z.string().trim().min(2, 'Display name must have at least 2 characters').max(100, 'Display name cannot exceed 100 characters'),
  chargeKind: chargeKindSchema.default('RECURRING'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().nullable(),
});

export const updateFeeCategorySchema = z.object({
  displayName: z.string().trim().min(2, 'Display name must have at least 2 characters').max(100, 'Display name cannot exceed 100 characters').optional(),
  chargeKind: chargeKindSchema.optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  version: z.coerce.number().int().min(1, 'Version must be a positive integer'),
});

export const createFeeRuleSchema = z.object({
  categoryId: z.string().uuid('Invalid category UUID'),
  academicSessionId: z.string().uuid('Invalid session UUID').optional().nullable(),
  classId: z.string().uuid('Invalid class UUID').optional().nullable(),
  transportId: z.string().uuid('Invalid transport UUID').optional().nullable(),
  amount: z.coerce.number().min(0, 'Amount must be >= 0').max(10000000, 'Amount cannot exceed 10,000,000'),
  effectiveFrom: z.string().trim().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/, 'effectiveFrom must be in YYYY-MM-DD format'),
  validUntil: z.string().trim().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/, 'validUntil must be in YYYY-MM-DD format').optional().nullable(),
  recurrencePolicy: recurrencePolicySchema.default('MONTHLY'),
  paymentDueOffset: z.coerce.number().int().min(1).max(31).optional().nullable(),
}).refine((data) => {
  if (data.validUntil && data.effectiveFrom > data.validUntil) {
    return false;
  }
  return true;
}, {
  message: 'validUntil must be on or after effectiveFrom',
  path: ['validUntil'],
});

export const updateFeeRuleSchema = z.object({
  transportId: z.string().uuid('Invalid transport UUID').optional().nullable(),
  amount: z.coerce.number().min(0, 'Amount must be >= 0').max(10000000, 'Amount cannot exceed 10,000,000').optional(),
  effectiveFrom: z.string().trim().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/, 'effectiveFrom must be in YYYY-MM-DD format').optional(),
  validUntil: z.string().trim().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/, 'validUntil must be in YYYY-MM-DD format').optional().nullable(),
  recurrencePolicy: recurrencePolicySchema.optional(),
  paymentDueOffset: z.coerce.number().int().min(1).max(31).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  version: z.coerce.number().int().min(1, 'Version must be a positive integer'),
});

export const resolveRulesQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  academicSessionId: z.string().uuid().optional(),
  transportId: z.string().uuid().optional(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'asOfDate must be in YYYY-MM-DD format').optional(),
});
