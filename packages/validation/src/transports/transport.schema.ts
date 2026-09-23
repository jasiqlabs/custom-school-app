import { z } from 'zod';

export const transportStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const assignmentStatusSchema = z.enum(['ACTIVE', 'ENDED']);

export const timeStringSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format, expected HH:MM')
  .optional()
  .nullable();

export const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')
  .optional()
  .nullable();

export const createTransportSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  transportNumber: z.string().trim().min(1, 'Transport number is required').max(50),
  vehicleNumber: z.string().trim().max(50).optional().nullable(),
  pickupTime: timeStringSchema,
  dropTime: timeStringSchema,
});

export const updateTransportSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    transportNumber: z.string().trim().min(1).max(50).optional(),
    vehicleNumber: z.string().trim().max(50).optional().nullable(),
    pickupTime: timeStringSchema,
    dropTime: timeStringSchema,
    version: z.number().int().positive().optional(),
  })
  .refine(v => Object.keys(v).length > 0, 'At least one field must be provided for update');

export const updateTransportStatusSchema = z.object({
  status: transportStatusSchema,
});

export const createTransportStoppageSchema = z.object({
  name: z.string().trim().min(2, 'Stoppage name must be at least 2 characters').max(100),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const updateTransportStoppageSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    version: z.number().int().positive().optional(),
  })
  .refine(v => Object.keys(v).length > 0, 'At least one field must be provided for update');

export const updateStoppageStatusSchema = z.object({
  status: transportStatusSchema,
});

export const reorderStoppagesSchema = z.object({
  stoppageIds: z.array(z.string().uuid('Invalid stoppage ID')).min(1, 'At least one stoppage required'),
});

export const assignStudentTransportSchema = z
  .object({
    studentId: z.string().uuid('Invalid student ID'),
    stoppageId: z.string().uuid('Invalid stoppage ID'),
    serviceStartDate: dateStringSchema,
    serviceEndDate: dateStringSchema,
  })
  .refine(
    data => {
      if (data.serviceStartDate && data.serviceEndDate) {
        return data.serviceEndDate >= data.serviceStartDate;
      }
      return true;
    },
    {
      message: 'Service end date cannot precede start date',
      path: ['serviceEndDate'],
    }
  );

export const reassignStudentTransportSchema = z
  .object({
    newStoppageId: z.string().uuid('Invalid stoppage ID'),
    serviceStartDate: dateStringSchema,
    serviceEndDate: dateStringSchema,
    reason: z.string().trim().max(255).optional().nullable(),
  })
  .refine(
    data => {
      if (data.serviceStartDate && data.serviceEndDate) {
        return data.serviceEndDate >= data.serviceStartDate;
      }
      return true;
    },
    {
      message: 'Service end date cannot precede start date',
      path: ['serviceEndDate'],
    }
  );

export const endStudentTransportSchema = z.object({
  reason: z.string().trim().max(255).optional().nullable(),
  setStudentPreferenceNo: z.boolean().optional().default(false),
});

export const transportAssignmentDirectoryQuerySchema = z.object({
  query: z.string().trim().optional(),
  transportId: z.string().uuid().optional(),
  stoppageId: z.string().uuid().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'ENDED']).optional().default('ALL'),
  effectiveNow: z
    .preprocess(val => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean())
    .optional(),
  date: dateStringSchema,
  page: z.preprocess(val => (val !== undefined ? Number(val) : 1), z.number().int().positive()).optional().default(1),
  limit: z
    .preprocess(val => (val !== undefined ? Number(val) : 20), z.number().int().min(1).max(100))
    .optional()
    .default(20),
});
