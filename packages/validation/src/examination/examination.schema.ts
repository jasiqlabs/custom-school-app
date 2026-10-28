import { z } from 'zod';
import { uuidSchema } from '../index';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const examContextStatusSchema = z.enum(['DRAFT', 'READY', 'CLOSED']);
export const admitCardStatusSchema = z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED']);

export const createExamContextSchema = z.object({
  academicSessionId: uuidSchema,
  classId: uuidSchema,
  title: z.string().trim().min(2, 'Exam title must be at least 2 characters').max(120),
  examCode: z.string().trim().max(32).optional().nullable(),
  examStart: z.string().trim().regex(dateRegex, 'examStart must be in YYYY-MM-DD format'),
  examEnd: z.string().trim().regex(dateRegex, 'examEnd must be in YYYY-MM-DD format'),
  venue: z.string().trim().max(200).optional().nullable(),
  instructions: z.string().trim().max(2000).optional().nullable(),
}).refine(data => data.examEnd >= data.examStart, {
  message: 'examEnd date must be on or after examStart date',
  path: ['examEnd'],
});

export const updateExamContextSchema = z.object({
  version: z.number().int().positive('Version must be a positive integer'),
  title: z.string().trim().min(2, 'Exam title must be at least 2 characters').max(120).optional(),
  examCode: z.string().trim().max(32).optional().nullable(),
  examStart: z.string().trim().regex(dateRegex, 'examStart must be in YYYY-MM-DD format').optional(),
  examEnd: z.string().trim().regex(dateRegex, 'examEnd must be in YYYY-MM-DD format').optional(),
  venue: z.string().trim().max(200).optional().nullable(),
  instructions: z.string().trim().max(2000).optional().nullable(),
  status: examContextStatusSchema.optional(),
}).refine(data => {
  if (data.examStart && data.examEnd) {
    return data.examEnd >= data.examStart;
  }
  return true;
}, {
  message: 'examEnd date must be on or after examStart date',
  path: ['examEnd'],
});

export const issueAdmitCardsSchema = z.object({
  examContextId: uuidSchema,
  studentIds: z.array(uuidSchema).min(1, 'At least one student must be selected'),
  requestKey: z.string().trim().min(1).max(64).optional(),
  templateVersion: z.string().trim().min(1).max(64).default('standard-v1'),
});

