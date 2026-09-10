import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(255);
export const passwordSchema = z.string().min(12).max(128)
  .refine(v => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v), 'Password must include upper, lower and number');
export const uuidSchema = z.string().uuid();
export const schoolCreateSchema = z.object({
  name: z.string().trim().min(2).max(255),
  address: z.string().trim().max(2000).optional().nullable(),
  phone: z.string().trim().min(6).max(32).optional().nullable(),
  email: emailSchema.optional().nullable(),
  duplicateConfirmationToken: z.string().max(4096).optional()
});
export const schoolUpdateSchema = schoolCreateSchema.omit({ duplicateConfirmationToken: true }).partial().extend({ version: z.number().int().positive() });
export const principalSchema = z.object({ name: z.string().trim().min(2).max(255), phone: z.string().trim().max(32).optional().nullable(), email: emailSchema.optional().nullable() });
export const academicCreateSchema = z.object({ name: z.string().trim().min(1).max(64), sortOrder: z.number().int().min(0).max(9999).default(0) });
export const academicUpdateSchema = z.object({ name: z.string().trim().min(1).max(64).optional(), sortOrder: z.number().int().min(0).max(9999).optional(), status: z.enum(['ACTIVE','INACTIVE']).optional() }).refine(v => Object.keys(v).length > 0, 'At least one field is required');
export const operatorCreateSchema = z.object({ email: emailSchema, fullName: z.string().trim().min(2).max(255), password: passwordSchema });
export const operatorUpdateSchema = z.object({ email: emailSchema.optional(), fullName: z.string().trim().min(2).max(255).optional() }).refine(v => Object.keys(v).length > 0, 'At least one field is required');
export const resetPasswordSchema = z.object({ password: passwordSchema.optional(), generateTemporary: z.boolean().optional().default(false) }).refine(v => Boolean(v.password) || v.generateTemporary, 'Password or generateTemporary is required');
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(256) });
export const passwordResetRequestSchema = z.object({ email: emailSchema });
export const tcIssueSchema = z.object({ studentId: uuidSchema, templateVersion: z.string().trim().min(1).max(64).default('standard-v1') });

export const normalizeHumanName = (value: string) => value.trim().replace(/\s+/g, ' ');
export const normalizeKey = (value: string) => normalizeHumanName(value).toLocaleLowerCase('en-IN');
