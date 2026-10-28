import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(255);
export const passwordSchema = z.string().min(12).max(128)
  .refine(v => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v), 'Password must include upper, lower and number');
export const uuidSchema = z.string().trim().refine(
  v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) || /^SCH-[A-Z0-9]{3,12}$/i.test(v) || /^[A-Za-z0-9_-]{3,64}$/.test(v),
  'Invalid UUID or identifier'
);
export const schoolIdSchema = z.string().trim().min(3).max(36);
export const schoolCreateSchema = z.object({
  name: z.string().trim().min(2).max(255),
  address: z.string().trim().max(2000).optional().nullable(),
  phone: z.string().trim().min(6).max(32).optional().nullable(),
  email: emailSchema.optional().nullable(),
  udiseNumber: z.string().trim().max(32).optional().nullable(),
  schoolCode: z.string().trim().max(64).optional().nullable(),
  affiliationNumber: z.string().trim().max(64).optional().nullable(),
  duplicateConfirmationToken: z.string().max(4096).optional()
});
export const schoolUpdateSchema = schoolCreateSchema.omit({ duplicateConfirmationToken: true }).partial().extend({ version: z.number().int().positive() });
export const schoolActivateSchema = z.object({
  expectedVersion: z.number().int().positive(),
  confirmWarnings: z.boolean().optional().default(false)
});
export const principalSchema = z.object({ name: z.string().trim().min(2).max(255), phone: z.string().trim().max(32).optional().nullable(), email: emailSchema.optional().nullable() });
export const academicCreateSchema = z.object({ name: z.string().trim().min(1).max(64), sortOrder: z.number().int().min(0).max(9999).default(0) });
export const academicUpdateSchema = z.object({ name: z.string().trim().min(1).max(64).optional(), sortOrder: z.number().int().min(0).max(9999).optional(), status: z.enum(['ACTIVE','INACTIVE']).optional() }).refine(v => Object.keys(v).length > 0, 'At least one field is required');
export const operatorRoleSchema = z.enum(['MANAGER', 'REPORT_VIEWER']);
export const operatorCreateSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2).max(255),
  password: passwordSchema,
  role: operatorRoleSchema.default('MANAGER')
});
export const operatorUpdateSchema = z.object({
  email: emailSchema.optional(),
  fullName: z.string().trim().min(2).max(255).optional(),
  role: operatorRoleSchema.optional()
}).refine(v => Object.keys(v).length > 0, 'At least one field is required');
export const resetPasswordSchema = z.object({
  password: passwordSchema.optional(),
  newPassword: passwordSchema.optional(),
  generateTemporary: z.boolean().optional().default(false)
}).transform(v => ({
  ...v,
  password: v.password || v.newPassword
})).refine(v => Boolean(v.password) || v.generateTemporary, 'Password or generateTemporary is required');
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(256) });
export const passwordResetRequestSchema = z.object({ email: emailSchema });
export const tcIssueSchema = z.object({ studentId: uuidSchema, templateVersion: z.string().trim().min(1).max(64).default('standard-v1') });

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createAcademicSessionSchema = z.object({
  code: z.string().trim().min(1).max(32),
  label: z.string().trim().min(1).max(100),
  startDate: z.string().trim().regex(dateRegex, 'startDate must be in YYYY-MM-DD format'),
  endDate: z.string().trim().regex(dateRegex, 'endDate must be in YYYY-MM-DD format'),
}).refine(data => data.endDate >= data.startDate, {
  message: 'endDate must be greater than or equal to startDate',
  path: ['endDate'],
});

export const updateAcademicSessionSchema = z.object({
  version: z.number().int().positive(),
  label: z.string().trim().min(1).max(100).optional(),
  startDate: z.string().trim().regex(dateRegex, 'startDate must be in YYYY-MM-DD format').optional(),
  endDate: z.string().trim().regex(dateRegex, 'endDate must be in YYYY-MM-DD format').optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: 'endDate must be greater than or equal to startDate',
  path: ['endDate'],
});

export const activateAcademicSessionSchema = z.object({
  version: z.number().int().positive(),
});

export const normalizeHumanName = (value: string) => value.trim().replace(/\s+/g, ' ');
export const normalizeKey = (value: string) => normalizeHumanName(value).toLocaleLowerCase('en-IN');

export * from './students/student.schema';
export * from './fees/fee.schema';
export * from './transports/transport.schema';
export * from './dashboard/dashboard.schema';
export * from './examination/examination.schema';
