import { QueryUtilizationService } from './query-utilization.service';
import { TransportsPublicFacadeImpl } from '../facade/transports-public.facade';
import { TransportsRepository } from '../repository/transports.repository';
import { PrismaService } from '../../../database/prisma.service';
import { AssignmentStatus, TransportStatus } from '@prisma/client';

describe('QueryUtilizationService & Facade (VT-005-016, VT-005-017, VT-005-018, VT-005-019, VT-005-020)', () => {
  let service: QueryUtilizationService;
  let facade: TransportsPublicFacadeImpl;
  let mockPrisma: any;
  let mockRepo: any;

  const schoolId = 'SCH-TEST-001';

  beforeEach(() => {
    mockRepo = {
      listStudentHistory: jest.fn(),
      getActiveChoices: jest.fn(),
    };

    mockPrisma = {
      transport: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'tr-1',
            schoolId,
            name: 'Green Bus',
            transportNumber: 'GB-10',
            vehicleNumber: 'KA-01-1111',
            status: TransportStatus.ACTIVE,
            stoppages: [
              { id: 'stp-1', name: 'Stop A', sortOrder: 0, status: TransportStatus.ACTIVE },
              { id: 'stp-2', name: 'Stop B', sortOrder: 1, status: TransportStatus.ACTIVE },
            ],
          },
        ]),
      },
      transportAssignment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'asgn-1',
            schoolId,
            studentId: 'stu-active',
            transportId: 'tr-1',
            stoppageId: 'stp-1',
            status: AssignmentStatus.ACTIVE,
            serviceStartDate: new Date('2026-09-01'),
            serviceEndDate: null,
            student: { status: 'ACTIVE' },
            transport: { status: TransportStatus.ACTIVE },
            stoppage: { status: TransportStatus.ACTIVE },
          },
          {
            id: 'asgn-future',
            schoolId,
            studentId: 'stu-future',
            transportId: 'tr-1',
            stoppageId: 'stp-2',
            status: AssignmentStatus.ACTIVE,
            serviceStartDate: new Date('2026-10-01'), // Future date relative to 2026-09-23
            serviceEndDate: null,
            student: { status: 'ACTIVE' },
            transport: { status: TransportStatus.ACTIVE },
            stoppage: { status: TransportStatus.ACTIVE },
          },
          {
            id: 'asgn-inactive-student',
            schoolId,
            studentId: 'stu-inactive',
            transportId: 'tr-1',
            stoppageId: 'stp-1',
            status: AssignmentStatus.ACTIVE,
            serviceStartDate: new Date('2026-09-01'),
            serviceEndDate: null,
            student: { status: 'INACTIVE' }, // Inactive student
            transport: { status: TransportStatus.ACTIVE },
            stoppage: { status: TransportStatus.ACTIVE },
          },
        ]),
      },
    };

    service = new QueryUtilizationService(mockRepo as TransportsRepository, mockPrisma as PrismaService);
    facade = new TransportsPublicFacadeImpl(mockRepo as TransportsRepository, service);
  });

  it('VT-005-016 & VT-005-017: correctly evaluates effectiveNow predicate against Asia/Kolkata date', async () => {
    // Evaluation on 2026-09-23
    const result = await service.getEffectiveCounts(schoolId, '2026-09-23');

    expect(result.businessDate).toBe('2026-09-23');
    expect(result.totalActiveTransports).toBe(1);
    expect(result.totalActiveStoppages).toBe(2);
    // Only asgn-1 is effective (asgn-future is in October, asgn-inactive-student has inactive student)
    expect(result.totalEffectiveStudents).toBe(1);

    const tr1 = result.transports[0];
    expect(tr1.effectiveStudents).toBe(1);
    expect(tr1.stoppages[0].effectiveStudents).toBe(1);
    expect(tr1.stoppages[1].effectiveStudents).toBe(0);
  });

  it('VT-005-019: facade provides getEffectiveSummary and getStudentTransportSummary DTOs', async () => {
    mockRepo.listStudentHistory.mockResolvedValue([
      {
        id: 'asgn-1',
        transportId: 'tr-1',
        stoppageId: 'stp-1',
        status: AssignmentStatus.ACTIVE,
        serviceStartDate: new Date('2026-09-01'),
        serviceEndDate: null,
        transport: { name: 'Green Bus' },
        stoppage: { name: 'Stop A' },
      },
    ]);

    const summary = await facade.getEffectiveSummary(schoolId);
    expect(summary.availability).toBe('AVAILABLE');
    expect(summary.activeTransports).toBe(1);
    expect(summary.effectiveStudents).toBe(1);

    const studentSummary = await facade.getStudentTransportSummary({ schoolId, studentId: 'stu-1' });
    expect(studentSummary.availability).toBe('AVAILABLE');
    expect(studentSummary.assignment?.routeName).toBe('Green Bus');
    expect(studentSummary.assignment?.stoppageName).toBe('Stop A');
  });
});
