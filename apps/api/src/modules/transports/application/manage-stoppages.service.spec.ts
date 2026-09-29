import { ConflictException, NotFoundException } from '@nestjs/common';
import { ManageStoppagesService } from './manage-stoppages.service';
import { TransportsRepository } from '../repository/transports.repository';
import { TransportStatus } from '@prisma/client';
import type { SessionActor } from '@custom-school/contracts';

describe('ManageStoppagesService (VT-005-002, VT-005-004)', () => {
  let service: ManageStoppagesService;
  let mockRepo: any;

  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: 'SCH-TEST-001',
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  beforeEach(() => {
    mockRepo = {
      findTransportById: jest.fn(),
      findStoppageById: jest.fn(),
      findStoppageByName: jest.fn(),
      createStoppage: jest.fn(),
      updateStoppage: jest.fn(),
      updateStoppageStatus: jest.fn(),
      reorderStoppages: jest.fn(),
      countActiveAssignmentsForStoppage: jest.fn(),
      withTransaction: jest.fn((cb) =>
        cb({
          $queryRaw: jest.fn().mockResolvedValue([{ id: 'stp-1' }]),
        })
      ),
    };

    service = new ManageStoppagesService(mockRepo as TransportsRepository);
  });

  it('VT-005-002: creates stoppage when name is unique within parent transport', async () => {
    mockRepo.findTransportById.mockResolvedValue({ id: 'tr-1', name: 'Route 1' });
    mockRepo.findStoppageByName.mockResolvedValue(null);
    mockRepo.createStoppage.mockResolvedValue({
      id: 'stp-1',
      name: 'Main Gate',
      sortOrder: 1,
      status: TransportStatus.ACTIVE,
    });

    const result = await service.createStoppage(actor, 'tr-1', {
      name: 'Main Gate',
      sortOrder: 1,
    });

    expect(result.id).toBe('stp-1');
  });

  it('VT-005-002: rejects stoppage creation if duplicate name on same transport', async () => {
    mockRepo.findTransportById.mockResolvedValue({ id: 'tr-1', name: 'Route 1' });
    mockRepo.findStoppageByName.mockResolvedValue({ id: 'existing-stp' });

    await expect(
      service.createStoppage(actor, 'tr-1', {
        name: 'Main Gate',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('VT-005-004: blocks stoppage deactivation if active assignments exist', async () => {
    mockRepo.findStoppageById.mockResolvedValue({ id: 'stp-1', name: 'Main Gate', status: TransportStatus.ACTIVE });
    mockRepo.countActiveAssignmentsForStoppage.mockResolvedValue(2);

    await expect(
      service.updateStoppageStatus(actor, 'stp-1', TransportStatus.INACTIVE)
    ).rejects.toThrow(ConflictException);
  });

  it('VT-005-004: allows stoppage deactivation when 0 active assignments exist', async () => {
    mockRepo.findStoppageById.mockResolvedValue({ id: 'stp-1', name: 'Main Gate', status: TransportStatus.ACTIVE });
    mockRepo.countActiveAssignmentsForStoppage.mockResolvedValue(0);
    mockRepo.updateStoppageStatus.mockResolvedValue({ id: 'stp-1', status: TransportStatus.INACTIVE });

    const result = await service.updateStoppageStatus(actor, 'stp-1', TransportStatus.INACTIVE);
    expect(result.status).toBe(TransportStatus.INACTIVE);
  });
});
