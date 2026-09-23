import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReassignTransportService } from './reassign-transport.service';
import { EndTransportService } from './end-transport.service';
import { PrismaService } from '../../../database/prisma.service';
import { AssignmentStatus, TransportStatus } from '@prisma/client';
import type { SessionActor } from '@custom-school/contracts';

describe('Reassign & End Transport Services (VT-005-012, VT-005-013)', () => {
  let reassignService: ReassignTransportService;
  let endService: EndTransportService;
  let mockPrisma: any;

  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: 'SCH-TEST-001',
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  beforeEach(() => {
    mockPrisma = {};
    reassignService = new ReassignTransportService(mockPrisma as PrismaService);
    endService = new EndTransportService(mockPrisma as PrismaService);
  });

  describe('ReassignTransportService (VT-005-012)', () => {
    it('atomically marks old assignment ENDED with reason REASSIGNED and creates new ACTIVE assignment', async () => {
      let oldEnded = false;
      let endedReason = '';
      let newCreated = false;

      mockPrisma.$transaction = jest.fn(async (cb) => {
        const tx = {
          $queryRaw: jest.fn()
            .mockResolvedValueOnce([{ id: 'asgn-old', student_id: 'stu-1', status: AssignmentStatus.ACTIVE }])
            .mockResolvedValueOnce([
              {
                stoppage_id: 'stp-new',
                stoppage_name: 'New Stoppage',
                stoppage_status: TransportStatus.ACTIVE,
                transport_id: 'tr-new',
                transport_name: 'New Bus',
                transport_status: TransportStatus.ACTIVE,
              },
            ]),
          $executeRaw: jest.fn().mockResolvedValue(1),
          student: {
            findFirst: jest.fn().mockResolvedValue({ id: 'stu-1', status: 'ACTIVE', transportRequired: true }),
          },
          transportAssignment: {
            update: jest.fn().mockImplementation((args) => {
              if (args.where.id === 'asgn-old') {
                oldEnded = args.data.status === AssignmentStatus.ENDED;
                endedReason = args.data.endedReason;
              }
              return Promise.resolve({});
            }),
            create: jest.fn().mockImplementation((args) => {
              newCreated = args.data.status === AssignmentStatus.ACTIVE;
              return Promise.resolve({ id: 'asgn-replacement', ...args.data });
            }),
          },
        };
        return cb(tx);
      });

      const result = await reassignService.reassignStudent(actor, 'asgn-old', {
        newStoppageId: 'stp-new',
        reason: 'Shifted Residence',
      });

      expect(result.id).toBe('asgn-replacement');
      expect(oldEnded).toBe(true);
      expect(endedReason).toBe('Shifted Residence');
      expect(newCreated).toBe(true);
    });

    it('rejects reassigning an already ended assignment', async () => {
      mockPrisma.$transaction = jest.fn(async (cb) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 'asgn-old', student_id: 'stu-1', status: AssignmentStatus.ENDED }]),
        };
        return cb(tx);
      });

      await expect(
        reassignService.reassignStudent(actor, 'asgn-old', {
          newStoppageId: 'stp-new',
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('EndTransportService (VT-005-013)', () => {
    it('marks status ENDED and sets student state to SETUP_PENDING when transportRequired is still true', async () => {
      let studentState = '';
      mockPrisma.$transaction = jest.fn(async (cb) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 'asgn-1', student_id: 'stu-1', status: AssignmentStatus.ACTIVE }]),
          $executeRaw: jest.fn().mockResolvedValue(1),
          transportAssignment: {
            update: jest.fn().mockResolvedValue({ id: 'asgn-1', status: AssignmentStatus.ENDED }),
          },
          student: {
            findFirst: jest.fn().mockResolvedValue({ id: 'stu-1', transportRequired: true }),
            update: jest.fn().mockImplementation((args) => {
              studentState = args.data.transportSetupState;
              return Promise.resolve({});
            }),
          },
        };
        return cb(tx);
      });

      const result = await endService.endAssignment(actor, 'asgn-1', {
        reason: 'Parent request',
      });

      expect(result.status).toBe(AssignmentStatus.ENDED);
      expect(studentState).toBe('SETUP_PENDING');
    });

    it('marks status ENDED and sets student preference to NO when setStudentPreferenceNo is true', async () => {
      let studentState = '';
      let transportReq = true;
      mockPrisma.$transaction = jest.fn(async (cb) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 'asgn-1', student_id: 'stu-1', status: AssignmentStatus.ACTIVE }]),
          $executeRaw: jest.fn().mockResolvedValue(1),
          transportAssignment: {
            update: jest.fn().mockResolvedValue({ id: 'asgn-1', status: AssignmentStatus.ENDED }),
          },
          student: {
            findFirst: jest.fn().mockResolvedValue({ id: 'stu-1', transportRequired: true }),
            update: jest.fn().mockImplementation((args) => {
              studentState = args.data.transportSetupState;
              transportReq = args.data.transportRequired;
              return Promise.resolve({});
            }),
          },
        };
        return cb(tx);
      });

      await endService.endAssignment(actor, 'asgn-1', {
        reason: 'No longer needed',
        setStudentPreferenceNo: true,
      });

      expect(studentState).toBe('NOT_REQUIRED');
      expect(transportReq).toBe(false);
    });
  });
});
