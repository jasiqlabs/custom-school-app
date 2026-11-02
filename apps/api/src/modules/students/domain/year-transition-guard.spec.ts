import { ConflictException } from '@nestjs/common';
import { assertEnrollmentChangesAllowed } from './year-transition-guard';

describe('Year-transition / existing student enrollment compatibility', () => {
  function tx(prepared: boolean) {
    const lock = jest.fn().mockResolvedValue([{ id: 'school-1' }]);
    const lookup = jest.fn().mockResolvedValue(prepared ? { id: 'transition-1' } : null);
    return { $queryRaw: lock, yearTransition: { findFirst: lookup } } as any;
  }

  it('permits regular admission/enrollment edits when no year transition is frozen', async () => {
    const db = tx(false);
    await expect(assertEnrollmentChangesAllowed(db, 'school-1')).resolves.toBeUndefined();
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.yearTransition.findFirst).toHaveBeenCalledWith({
      where: { schoolId: 'school-1', status: { in: ['PREPARED', 'CLOSING'] } },
      select: { id: true },
    });
    expect(db.$queryRaw.mock.invocationCallOrder[0])
      .toBeLessThan(db.yearTransition.findFirst.mock.invocationCallOrder[0]);
  });

  it('blocks prepared/closing plans before changing student enrollment', async () => {
    const db = tx(true);
    await expect(assertEnrollmentChangesAllowed(db, 'school-1')).rejects.toThrow(ConflictException);
  });

  it('rejects missing school context without touching the transition', async () => {
    const db = tx(false);
    db.$queryRaw.mockResolvedValue([]);
    await expect(assertEnrollmentChangesAllowed(db, 'missing')).rejects.toThrow(ConflictException);
    expect(db.yearTransition.findFirst).not.toHaveBeenCalled();
  });
});
