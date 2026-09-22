import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigureFeeService } from './configure-fee.service';
import { PrismaService } from '../../../database/prisma.service';
import { FeesRepository } from '../repository/fees.repository';
import { AuditService } from '../../../platform/audit/audit.service';
import type { SessionActor } from '@custom-school/contracts';

describe('ConfigureFeeService', () => {
  let service: ConfigureFeeService;
  let mockPrisma: any;
  let mockRepo: any;
  let mockAudit: any;

  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: 'SCH-TEST-001',
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  beforeEach(() => {
    mockPrisma = {
      class: {
        findFirst: jest.fn(),
      },
    };
    mockRepo = {
      listConfigs: jest.fn(),
      upsertConfig: jest.fn(),
    };
    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    service = new ConfigureFeeService(
      mockPrisma as PrismaService,
      mockRepo as FeesRepository,
      mockAudit as AuditService
    );
  });

  it('rejects if amount <= 0', async () => {
    mockPrisma.class.findFirst.mockResolvedValue({ id: 'cls-1', name: 'Class 1' });

    await expect(
      service.upsertConfig(actor, {
        classId: 'cls-1',
        effectiveMonth: '2026-04',
        amount: 0,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects if class does not belong to school', async () => {
    mockPrisma.class.findFirst.mockResolvedValue(null);

    await expect(
      service.upsertConfig(actor, {
        classId: 'non-existent',
        effectiveMonth: '2026-04',
        amount: 1200,
      })
    ).rejects.toThrow(NotFoundException);
  });

  it('upserts valid configuration and writes audit', async () => {
    mockPrisma.class.findFirst.mockResolvedValue({ id: 'cls-1', name: 'Class 1' });
    mockRepo.upsertConfig.mockResolvedValue({
      id: 'cfg-1',
      schoolId: 'SCH-TEST-001',
      classId: 'cls-1',
      class: { name: 'Class 1' },
      effectiveMonth: '2026-04',
      amount: 1500,
      status: 'ACTIVE',
      version: 1,
      createdBy: actor.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.upsertConfig(actor, {
      classId: 'cls-1',
      effectiveMonth: '2026-04',
      amount: 1500,
    });

    expect(result.id).toBe('cfg-1');
    expect(result.amount).toBe(1500);
    expect(mockAudit.append).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'FEE_CONFIG_UPSERT' })
    );
  });
});
