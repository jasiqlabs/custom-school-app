import { z } from 'zod';
import { uuidSchema, emailSchema, normalizeHumanName } from '../index';

const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

export function validateVerhoeff(num: string): boolean {
  if (!/^\d+$/.test(num)) return false;
  let c = 0;
  const inverted = num.split('').reverse().map(Number);
  for (let i = 0; i < inverted.length; i++) {
    c = d[c][p[i % 8][inverted[i]]];
  }
  return c === 0;
}

export function validateAadhaar(aadhaar: string): boolean {
  const clean = aadhaar.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(clean)) return false;
  // Aadhaar cannot start with 0 or 1
  if (clean[0] === '0' || clean[0] === '1') return false;
  return validateVerhoeff(clean);
}

export function normalizeStudentCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export const studentCodeSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, 'Student ID must be alphanumeric with optional hyphens or underscores');

export const aadhaarSchema = z.string().trim().refine(v => {
  const clean = v.replace(/[\s-]/g, '');
  return /^\d{12}$/.test(clean) && clean[0] !== '0' && clean[0] !== '1';
}, 'Invalid Aadhaar number format');

export const panSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format');
export const ifscSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format');

export const concessionSchema = z.object({
  type: z.enum(['NONE', 'FIXED_AMOUNT', 'PERCENTAGE']),
  value: z.number().min(0, 'Concession value cannot be negative')
}).refine(v => {
  if (v.type === 'PERCENTAGE' && v.value > 100) return false;
  if (v.type === 'NONE' && v.value !== 0) return false;
  return true;
}, 'Invalid concession value for type');

export const bankDetailsSchema = z.object({
  bankName: z.string().trim().max(128).optional(),
  accountHolderName: z.string().trim().max(255).optional(),
  accountNumber: z.string().trim().max(34).optional(),
  ifsc: ifscSchema.optional(),
  branch: z.string().trim().max(128).optional()
}).optional();

export const disabilitySchema = z.object({
  hasDisability: z.boolean(),
  details: z.string().trim().max(500).optional()
}).optional();

export const studentAdmissionSchema = z.object({
  studentCodeMode: z.enum(['AUTO', 'MANUAL']),
  studentCode: z.string().trim().max(64).optional(),
  fullName: z.string().trim().min(1, 'Student name is required').max(255),
  fatherName: z.string().trim().min(1, 'Father name is required').max(255),
  motherName: z.string().trim().min(1, 'Mother name is required').max(255),
  familyCode: z.string().trim().max(64).optional().nullable(),
  tallyLedgerName: z.string().trim().max(255).optional().nullable(),
  dateOfBirth: z.string().trim().refine(v => !isNaN(Date.parse(v)), 'Invalid date of birth'),
  classId: uuidSchema,
  sectionId: uuidSchema,
  gender: z.enum(['BOY', 'GIRL']),
  admissionDate: z.string().trim().refine(v => !isNaN(Date.parse(v)), 'Invalid admission date').optional(),
  transportRequired: z.boolean().default(false),
  stoppageId: uuidSchema.optional().nullable(),
  serviceStartDate: z.string().trim().optional().nullable(),
  serviceEndDate: z.string().trim().optional().nullable(),
  address: z.string().trim().min(1, 'Address is required').max(2000),
  phone: z.string().trim().min(6).max(32),
  email: emailSchema.optional().nullable(),
  emergencyContact: z.string().trim().min(6).max(32),
  emergencyContactRelation: z.string().trim().min(1).max(64),
  aadhaarNumber: aadhaarSchema,
  panNumber: panSchema.optional().nullable(),
  penNumber: z.string().trim().max(64).optional().nullable(),
  udiseCode: z.string().trim().max(64).optional().nullable(),
  previousSchool: z.string().trim().max(255).optional().nullable(),
  previousTcNumber: z.string().trim().max(64).optional().nullable(),
  bank: bankDetailsSchema,
  bloodGroup: z.string().trim().max(16).optional().nullable(),
  nationality: z.string().trim().max(64).default('Indian'),
  religion: z.string().trim().max(64).optional().nullable(),
  caste: z.string().trim().max(64).optional().nullable(),
  disability: disabilitySchema,
  medicalConditions: z.string().trim().max(1000).optional().nullable(),
  allergies: z.string().trim().max(1000).optional().nullable(),
  hobbiesInterests: z.string().trim().max(1000).optional().nullable(),
  previousAchievements: z.string().trim().max(1000).optional().nullable(),
  concession: concessionSchema.default({ type: 'NONE', value: 0 }),
  photoFileId: uuidSchema.optional().nullable()
}).refine(v => {
  if (v.studentCodeMode === 'MANUAL') {
    return v.studentCode && v.studentCode.trim().length > 0;
  }
  return true;
}, { message: 'Student code is required when manual mode is selected', path: ['studentCode'] })
.refine(v => {
  if (v.serviceStartDate && v.serviceEndDate) {
    return new Date(v.serviceStartDate) <= new Date(v.serviceEndDate);
  }
  return true;
}, { message: 'Transport service end date cannot precede start date', path: ['serviceEndDate'] });

export const updateStudentProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(255).optional(),
  fatherName: z.string().trim().min(1).max(255).optional(),
  motherName: z.string().trim().min(1).max(255).optional(),
  familyCode: z.string().trim().max(64).optional().nullable(),
  tallyLedgerName: z.string().trim().max(255).optional().nullable(),
  dob: z.string().trim().optional(),
  gender: z.enum(['BOY', 'GIRL']).optional(),
  classId: uuidSchema.optional(),
  sectionId: uuidSchema.optional(),
  address: z.string().trim().min(1).max(2000).optional(),
  phone: z.string().trim().min(6).max(32).optional(),
  email: emailSchema.optional().nullable(),
  emergencyContact: z.string().trim().min(6).max(32).optional(),
  emergencyRelation: z.string().trim().min(1).max(64).optional(),
  penNumber: z.string().trim().max(64).optional().nullable(),
  udiseCode: z.string().trim().max(64).optional().nullable(),
  previousSchool: z.string().trim().max(255).optional().nullable(),
  previousTcNumber: z.string().trim().max(64).optional().nullable(),
  bloodGroup: z.string().trim().max(16).optional().nullable(),
  nationality: z.string().trim().max(64).optional(),
  religion: z.string().trim().max(64).optional().nullable(),
  caste: z.string().trim().max(64).optional().nullable(),
  hobbies: z.string().trim().max(1000).optional().nullable(),
  achievements: z.string().trim().max(1000).optional().nullable(),
  concession: concessionSchema.optional(),
  transportRequired: z.boolean().optional(),
  photoFileId: uuidSchema.optional().nullable(),
  version: z.number().int().positive('Version is required for optimistic locking')
});

export const changeStudentIdentifierSchema = z.object({
  newStudentCode: studentCodeSchema,
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(500),
  version: z.number().int().positive('Version is required')
});

export const changeStudentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
  reason: z.string().trim().max(500).optional()
}).refine(v => {
  if (v.status === 'INACTIVE') {
    return Boolean(v.reason && v.reason.trim().length > 0);
  }
  return true;
}, { message: 'Deactivation reason is mandatory', path: ['reason'] });

export const studentSearchSchema = z.object({
  q: z.string().trim().min(1, 'Search query cannot be empty'),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const studentDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  classId: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
  gender: z.enum(['BOY', 'GIRL']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  search: z.string().trim().optional()
});
