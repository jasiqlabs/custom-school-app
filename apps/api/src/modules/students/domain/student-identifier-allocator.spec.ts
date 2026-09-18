import { StudentIdentifierAllocator } from './student-identifier-allocator';

describe('StudentIdentifierAllocator', () => {
  let allocator: StudentIdentifierAllocator;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      studentIdSequence: {
        findUnique: jest.fn()
      },
      student: {
        findUnique: jest.fn()
      }
    };
    allocator = new StudentIdentifierAllocator(mockPrisma);
  });

  it('normalizes student codes properly removing whitespace and converting to uppercase', () => {
    expect(allocator.normalizeCode('  stu-2026-0001  ')).toBe('STU-2026-0001');
    expect(allocator.normalizeCode('abc 123')).toBe('ABC123');
  });

  it('suggests the next sequential student code', async () => {
    mockPrisma.studentIdSequence.findUnique.mockResolvedValue({ lastValue: 41 });
    mockPrisma.student.findUnique.mockResolvedValue(null);

    const suggested = await allocator.suggestNextCode('sch-1');
    const currentYear = new Date().getFullYear();
    expect(suggested).toBe(`STU-${currentYear}-0042`);
  });

  it('allocates nextVal atomically on auto code allocation', async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ last_value: 5 }]),
      student: {
        findUnique: jest.fn().mockResolvedValue(null)
      }
    };

    const code = await allocator.allocateAutoCode(tx, 'sch-1');
    const currentYear = new Date().getFullYear();
    expect(code).toBe(`STU-${currentYear}-0005`);
    expect(tx.$queryRaw).toHaveBeenCalled();
  });
});
