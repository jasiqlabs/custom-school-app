import { z } from 'zod';

export const UserRoleSchema = z.enum(['PLATFORM_ADMIN', 'SCHOOL_OPERATOR']);

export const CreateSessionDtoSchema = z.object({
  userId: z.string().uuid(),
  role: UserRoleSchema,
  schoolId: z.string().uuid().optional(),
  userAgent: z.string().optional(),
  ipHash: z.string().optional(),
}).refine(
  (data) => {
    // BR-AUTH-002: Operator sessions must carry schoolId
    if (data.role === 'SCHOOL_OPERATOR' && !data.schoolId) {
      return false;
    }
    return true;
  },
  {
    message: 'SCHOOL_OPERATOR role requires a valid schoolId (BR-AUTH-002)',
    path: ['schoolId'],
  }
);
