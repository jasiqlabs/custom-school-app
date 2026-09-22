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

export const collectPaymentSchema = z.object({
  studentId: z.string().uuid('Invalid student UUID'),
  dueId: z.string().uuid('Invalid due UUID'),
  amount: z.coerce.number().positive('Payment amount must be greater than zero').max(10000000, 'Payment amount too large'),
  mode: paymentModeSchema.default('CASH'),
  paymentDate: z.string().trim().regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/, 'Date must be in YYYY-MM-DD format'),
  reference: z.string().trim().max(128).optional().nullable(),
  idempotencyKey: z.string().trim().min(8, 'Idempotency key must have at least 8 characters').max(128),
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
