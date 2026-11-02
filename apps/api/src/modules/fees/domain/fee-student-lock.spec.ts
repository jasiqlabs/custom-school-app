import { NotFoundException } from '@nestjs/common';
import { lockStudentForFees } from './fee-student-lock';

describe('Error Drafts: safe student payment lock', () => {
  const schoolId = '11111111-1111-4111-8111-111111111111';
  const studentId = '22222222-2222-4222-8222-222222222222';

  it('locks only the requested student and school with UUID-typed parameters', async () => {
    const raw = jest.fn().mockResolvedValue([{ id: studentId }]);
    await lockStudentForFees({ $queryRaw: raw } as any, schoolId, studentId);
    const sql = (raw.mock.calls[0][0] as TemplateStringsArray).join('$');
    expect(sql).toContain('school_id = $::uuid AND id = $::uuid');
    expect(raw.mock.calls[0].slice(1)).toEqual([schoolId, studentId]);
    expect(sql).toContain('FOR UPDATE');
  });

  it('rejects a missing or cross-school student before any payment mutation', async () => {
    const raw = jest.fn().mockResolvedValue([]);
    await expect(lockStudentForFees({ $queryRaw: raw } as any, schoolId, studentId))
      .rejects.toThrow(NotFoundException);
  });
});
