import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AssignTransportService } from './assign-transport.service';
import { TransportsRepository } from '../repository/transports.repository';
import { PrismaService } from '../../../database/prisma.service';
import { TransportStatus, AssignmentStatus } from '@prisma/client';
import type { SessionActor } from '@custom-school/contracts';

describe('AssignTransportService (VT-005-006, VT-005-007, VT-005-008, VT-005-009, VT-005-010, VT-005-011)', () => {
  let service: AssignTransportService;
  let mockPrisma: any;
  let mockRepo: any;

  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: 'SCH-TEST-001',
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  beforeEach(() => {
    mockRepo = {};
    mockPrisma = {
      $transaction: jest.fn(async (cb) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(1),
          student: {
            findFirst: jest.fn(),
            update: jest.fn().mockResolvedValue({}),
          },
          $queryRaw: jest.fn(),
          transportAssignment: {
            findFirst: jest.fn(),
            create: jest.fn(),
          },
        };
        return cb(tx);
      }),
    };

    service = new AssignTransportService(mockRepo as TransportsRepository, mockPrisma as PrismaService);
  });

  it('VT-005-009: rejects if service end date precedes start date', async () => {
    await expect(
      service.assignStudent(actor, {
        studentId: '11111111-1111-1111-1111-111111111111',
        stoppageId: '22222222-2222-2222-2222-222222222222',
        serviceStartDate: '2026-09-10',
        serviceEndDate: '2026-09-01',
      })
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('VT-005-006: rejects if student is not found or inactive', async () => {
    mockPrisma.$transaction = jest.fn(async (cb) => {
      const tx = {
        $executeRaw: jest.fn(),
        student: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'stu-1',
            fullName: 'John Doe',
            status: 'INACTIVE',
            transportRequired: true,
          }),
        },
      };
      return cb(tx);
    });

    await expect(
      service.assignStudent(actor, {
        studentId: '11111111-1111-1111-1111-111111111111',
        stoppageId: '22222222-2222-2222-2222-222222222222',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('VT-005-007: rejects with 409 if student transportRequired is false', async () => {
    mockPrisma.$transaction = jest.fn(async (cb) => {
      const tx = {
        $executeRaw: jest.fn(),
        student: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'stu-1',
            fullName: 'John Doe',
            status: 'ACTIVE',
            transportRequired: false,
          }),
        },
      };
      return cb(tx);
    });

    await expect(
      service.assignStudent(actor, {
        studentId: '11111111-1111-1111-1111-111111111111',
        stoppageId: '22222222-2222-2222-2222-222222222222',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('VT-005-008: rejects if stoppage or parent transport is inactive', async () => {
    mockPrisma.$transaction = jest.fn(async (cb) => {
      const tx = {
        $executeRaw: jest.fn(),
        student: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'stu-1',
            fullName: 'John Doe',
            status: 'ACTIVE',
            transportRequired: true,
          }),
        },
        $queryRaw: jest.fn().mockResolvedValue([
          {
            stoppage_id: 'stp-1',
            stoppage_name: 'Stoppage 1',
            stoppage_status: TransportStatus.INACTIVE,
            transport_id: 'tr-1',
            transport_name: 'Bus 1',
            transport_status: TransportStatus.ACTIVE,
          },
        ]),
      };
      return cb(tx);
    });

    await expect(
      service.assignStudent(actor, {
        studentId: '11111111-1111-1111-1111-111111111111',
        stoppageId: '22222222-2222-2222-2222-222222222222',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('VT-005-010: rejects if student already has an ACTIVE assignment', async () => {
    mockPrisma.$transaction = jest.fn(async (cb) => {
      const tx = {
        $executeRaw: jest.fn(),
        student: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'stu-1',
            fullName: 'John Doe',
            status: 'ACTIVE',
            transportRequired: true,
          }),
        },
        $queryRaw: jest.fn().mockResolvedValue([
          {
            stoppage_id: 'stp-1',
            stoppage_name: 'Stoppage 1',
            stoppage_status: TransportStatus.ACTIVE,
            transport_id: 'tr-1',
            transport_name: 'Bus 1',
            transport_status: TransportStatus.ACTIVE,
          },
        ]),
        transportAssignment: {
          findFirst: jest.fn().mockResolvedValue({ id: 'existing-act' }),
        },
      };
      return cb(tx);
    });

    await expect(
      service.assignStudent(actor, {
        studentId: '11111111-1111-1111-1111-111111111111',
        stoppageId: '22222222-2222-2222-2222-222222222222',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('VT-005-011: creates assignment and reconciles student setup state to ACTIVE', async () => {
    let reconciledState = '';
    mockPrisma.$transaction = jest.fn(async (cb) => {
      const tx = {
        $executeRaw: jest.fn(),
        student: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'stu-1',
            fullName: 'John Doe',
            status: 'ACTIVE',
            transportRequired: true,
          }),
          update: jest.fn().mockImplementation((args) => {
            reconciledState = args.data.transportSetupState;
            return Promise.resolve({});
          }),
        },
        $queryRaw: jest.fn().mockResolvedValue([
          {
            stoppage_id: 'stp-1',
            stoppage_name: 'Stoppage 1',
            stoppage_status: TransportStatus.ACTIVE,
            transport_id: 'tr-1',
            transport_name: 'Bus 1',
            transport_status: TransportStatus.ACTIVE,
          },
        ]),
        transportAssignment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'asgn-new',
            status: AssignmentStatus.ACTIVE,
          }),
        },
      };
      return cb(tx);
    });

    const result = await service.assignStudent(actor, {
      studentId: '11111111-1111-1111-1111-111111111111',
      stoppageId: '22222222-2222-2222-2222-222222222222',
      serviceStartDate: '2026-09-01',
    });

    expect(result.id).toBe('asgn-new');
    expect(reconciledState).toBe('ACTIVE');
  });
});
