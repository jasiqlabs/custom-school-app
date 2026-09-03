import { z } from 'zod';

export const SubsystemHealthSchema = z.object({
  status: z.enum(['up', 'down']),
  latencyMs: z.number().optional(),
  message: z.string().optional(),
});

export const HealthCheckResultSchema = z.object({
  status: z.enum(['ok', 'error']),
  service: z.string(),
  timestamp: z.string(),
  version: z.string().optional(),
  checks: z
    .object({
      database: SubsystemHealthSchema,
      redis: SubsystemHealthSchema,
      minio: SubsystemHealthSchema,
    })
    .optional(),
});

export const LivenessResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
});

export const ReadinessResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  service: z.string(),
  checks: z.object({
    database: SubsystemHealthSchema,
    redis: SubsystemHealthSchema,
    minio: SubsystemHealthSchema,
  }),
});
