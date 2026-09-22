import { FeesPublicFacadeImpl } from './fees-public.facade';
import { PrismaService } from '../../../database/prisma.service';
import { FeesRepository } from '../repository/fees.repository';

describe('FeesPublicFacadeImpl', () => {
  let facade: FeesPublicFacadeImpl;
  let mockPrisma: any;
  let mockRepo: any;

  beforeEach(() => {
    mockPrisma = {
      student: {
        findFirst: jest.fn(),
      },
    };
    mockRepo = {
      findEffectiveConfig: jest.fn(),
      listDuesByStudent: jest.fn(),
      findPaymentsForDashboard: jest.fn(),
      findOutstandingDues: jest.fn(),
    };
    facade = new FeesPublicFacadeImpl(
      mockPrisma as PrismaService,
      mockRepo as FeesRepository
    );
  });

  it('returns UNAVAILABLE if student does not exist', async () => {
    mockPrisma.student.findFirst.mockResolvedValue(null);

    const summary = await facade.getStudentFeeSummary({
      schoolId: 'sch-1',
      studentId: 'st-none',
    });

    expect(summary.availability).toBe('UNAVAILABLE');
  });

  it('returns live student fee summary with month breakdown', async () => {
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 'st-1',
      concessionType: 'PERCENTAGE',
      concessionValue: 10,
      enrollments: [{ classId: 'cls-1' }],
    });
    mockRepo.findEffectiveConfig.mockResolvedValue({
      id: 'cfg-1',
      amount: 2000,
    });
    mockRepo.listDuesByStudent.mockResolvedValue([
      {
        feeMonth: '2026-05',
        netDue: 1800,
        paidAmount: 1800,
        balance: 0,
        status: 'PAID',
      },
      {
        feeMonth: '2026-06',
        netDue: 1800,
        paidAmount: 800,
        balance: 1000,
        status: 'PARTIAL',
      },
    ]);

    const summary = await facade.getStudentFeeSummary({
      schoolId: 'sch-1',
      studentId: 'st-1',
    });

    expect(summary.availability).toBe('AVAILABLE');
    expect(summary.baseFee).toBe(2000);
    expect(summary.netDue).toBe(3600);
    expect(summary.totalPaid).toBe(2600);
    expect(summary.outstandingBalance).toBe(1000);
    expect(summary.monthWiseSummary).toHaveLength(2);
  });
});
