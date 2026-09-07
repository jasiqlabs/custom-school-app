import { z } from 'zod';

export const loginPlatformAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createSchoolSchema = z.object({
  name: z.string().trim().min(2, 'School name must be at least 2 characters'),
  code: z.string().trim().min(2).max(32).optional(),
  address: z.string().trim().optional().nullable(),
  contactEmail: z.string().email('Invalid contact email').optional().nullable(),
  contactPhone: z.string().trim().optional().nullable(),
  confirmDuplicateName: z.boolean().optional(),
});

export const updateSchoolProfileSchema = z.object({
  name: z.string().trim().min(2, 'School name must be at least 2 characters').optional(),
  address: z.string().trim().optional().nullable(),
  contactEmail: z.string().email('Invalid contact email').optional().nullable(),
  contactPhone: z.string().trim().optional().nullable(),
  logoFileId: z.string().uuid('Invalid logo file ID').optional().nullable(),
});

export const updatePrincipalSchema = z.object({
  principalName: z.string().trim().optional().nullable(),
  contactNumber: z
    .string()
    .regex(/^\d{10}$/, 'Contact number must be exactly 10 digits')
    .optional()
    .nullable(),
  signatureFileId: z.string().uuid('Invalid signature file ID').optional().nullable(),
});

export const changeSchoolStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
    reason: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'INACTIVE' && (!data.reason || data.reason.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason is required when deactivating a school',
        path: ['reason'],
      });
    }
  });

export const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required').max(64),
  displayOrder: z.number().int().optional(),
});

export const updateClassSchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
  displayOrder: z.number().int().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const createSectionSchema = z.object({
  name: z.string().trim().min(1, 'Section name is required').max(64),
});

export const updateSectionSchema = z.object({
  name: z.string().trim().min(1).max(64).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const provisionOperatorSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid operator email'),
  temporaryPassword: z.string().min(8, 'Temporary password must be at least 8 characters'),
});

export const updateOperatorStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']),
});

export const generateTcSchema = z.object({
  includeLogo: z.boolean().optional().default(false),
  includeSignature: z.boolean().optional().default(false),
  idempotencyKey: z.string().optional(),
});
