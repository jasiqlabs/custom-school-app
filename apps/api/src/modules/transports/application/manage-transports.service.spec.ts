import { ConflictException, NotFoundException } from '@nestjs/common';
import { ManageTransportsService } from './manage-transports.service';
import { TransportsRepository } from '../repository/transports.repository';
import { TransportStatus } from '@prisma/client';
import type { SessionActor } from '@custom-school/contracts';

describe('ManageTransportsService (VT-005-001, VT-005-003, VT-005-005)', () => {
  let service: ManageTransportsService;
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
      listTransports: jest.fn(),
      findTransportById: jest.fn(),
      findTransportByNormalizedName: jest.fn(),
      findTransportByNumber: jest.fn(),
      createTransport: jest.fn(),
      updateTransport: jest.fn(),
      updateTransportStatus: jest.fn(),
      countActiveAssignmentsForTransport: jest.fn(),
      withTransaction: jest.fn((cb) =>
        cb({
          $queryRaw: jest.fn().mockResolvedValue([{ id: 'tr-1' }]),
        })
      ),
    };

    service = new ManageTransportsService(mockRepo as TransportsRepository);
  });

  it('VT-005-001: creates transport route when name and number are unique', async () => {
    mockRepo.findTransportByNormalizedName.mockResolvedValue(null);
    mockRepo.findTransportByNumber.mockResolvedValue(null);
    mockRepo.createTransport.mockResolvedValue({
      id: 'tr-1',
      name: 'North Route',
      transportNumber: 'BUS-01',
      status: TransportStatus.ACTIVE,
    });

    const result = await service.createTransport(actor, {
      name: 'North Route',
      transportNumber: 'BUS-01',
      vehicleNumber: 'KA-01-AB-1234',
      pickupTime: '07:30',
      dropTime: '15:30',
    });

    expect(result.id).toBe('tr-1');
    expect(mockRepo.createTransport).toHaveBeenCalledWith('SCH-TEST-001', expect.objectContaining({
      name: 'North Route',
      transportNumber: 'BUS-01',
    }));
  });

  it('VT-005-001: rejects transport creation if normalized name already exists in school', async () => {
    mockRepo.findTransportByNormalizedName.mockResolvedValue({ id: 'existing-tr' });

    await expect(
      service.createTransport(actor, {
        name: 'North Route',
        transportNumber: 'BUS-99',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('VT-005-001: rejects transport creation if transport number already exists in school', async () => {
    mockRepo.findTransportByNormalizedName.mockResolvedValue(null);
    mockRepo.findTransportByNumber.mockResolvedValue({ id: 'existing-tr' });

    await expect(
      service.createTransport(actor, {
        name: 'South Route',
        transportNumber: 'BUS-01',
      })
    ).rejects.toThrow(ConflictException);
  });

  it('VT-005-003 & VT-005-005: blocks deactivation with ConflictException if active student assignments exist', async () => {
    mockRepo.findTransportById.mockResolvedValue({ id: 'tr-1', name: 'North Route', status: TransportStatus.ACTIVE });
    mockRepo.countActiveAssignmentsForTransport.mockResolvedValue(3);

    await expect(
      service.updateTransportStatus(actor, 'tr-1', TransportStatus.INACTIVE)
    ).rejects.toThrow(ConflictException);
  });

  it('VT-005-003: allows deactivation if active assignment count is zero', async () => {
    mockRepo.findTransportById.mockResolvedValue({ id: 'tr-1', name: 'North Route', status: TransportStatus.ACTIVE });
    mockRepo.countActiveAssignmentsForTransport.mockResolvedValue(0);
    mockRepo.updateTransportStatus.mockResolvedValue({ id: 'tr-1', status: TransportStatus.INACTIVE });

    const result = await service.updateTransportStatus(actor, 'tr-1', TransportStatus.INACTIVE);
    expect(result.status).toBe(TransportStatus.INACTIVE);
  });
});
