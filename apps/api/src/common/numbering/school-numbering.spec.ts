import { allocateConfiguredNumber } from './school-numbering';

describe('FIX-11: school numbering policies', () => {
  const schoolId = '11111111-1111-1111-1111-111111111111';
  const tx: any = {
    academicSession: { findFirst: jest.fn().mockResolvedValue({ code: '2026-27' }) },
    $queryRaw: jest.fn().mockResolvedValue([{ last_value: 1 }]),
  };
  beforeEach(() => jest.clearAllMocks());

  it('does not allocate a custom number when legacy mode is selected', async () => {
    await expect(allocateConfiguredNumber(tx, {
      schoolId, kind: 'RECEIPT', policy: 'LEGACY', prefix: 'REC',
    })).rejects.toThrow();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
  it('allocates one sequence per academic year under a transaction', async () => {
    const value = await allocateConfiguredNumber(tx, {
      schoolId, kind: 'STUDENT', policy: 'ACADEMIC_YEAR', prefix: 'STU',
    });
    expect(value).toBe('STU-2026-27-00001');
    expect(tx.academicSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { schoolId, status: 'ACTIVE' },
    }));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it('retains school-specific prefix with continuous numbering', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ last_value: 13 }]);
    expect(await allocateConfiguredNumber(tx, {
      schoolId, kind: 'RECEIPT', policy: 'CONTINUOUS', prefix: 'FEE',
    })).toBe('FEE-00013');
  });
});
