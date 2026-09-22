import { BadRequestException } from '@nestjs/common';
import { VoidPaymentService } from './void-payment.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import type { SessionActor } from '@custom-school/contracts';

describe('VoidPaymentService', () => {
  let service: VoidPaymentService;
  let mockPrisma: any;
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
      $transaction: jest.fn(),
    };
    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    service = new VoidPaymentService(
      mockPrisma as PrismaService,
      mockAudit as AuditService
    );
  });

  it('rejects if reason is empty or shorter than 3 characters', async () => {
    await expect(
      service.voidPayment(actor, 'pay-1', { reason: ' ' })
    ).rejects.toThrow(BadRequestException);
  });
});
