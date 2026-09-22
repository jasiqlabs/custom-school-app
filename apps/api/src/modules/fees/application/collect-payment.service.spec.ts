import { BadRequestException } from '@nestjs/common';
import { CollectPaymentService } from './collect-payment.service';
import { PrismaService } from '../../../database/prisma.service';
import { FeesRepository } from '../repository/fees.repository';
import { ReceiptNumberAllocator } from '../domain/receipt-number-allocator';
import { AuditService } from '../../../platform/audit/audit.service';
import type { SessionActor } from '@custom-school/contracts';

describe('CollectPaymentService', () => {
  let service: CollectPaymentService;
  let mockPrisma: any;
  let mockRepo: any;
  let mockAllocator: any;
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
      student: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    mockRepo = {
      findPaymentByIdempotencyKey: jest.fn(),
      findPaymentById: jest.fn(),
      listDuesByStudent: jest.fn(),
      findDueByIdForUpdate: jest.fn(),
    };
    mockAllocator = {
      allocateReceiptNumber: jest.fn(),
    };
    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    service = new CollectPaymentService(
      mockPrisma as PrismaService,
      mockRepo as FeesRepository,
      mockAllocator as ReceiptNumberAllocator,
      mockAudit as AuditService
    );
  });

  it('rejects payment if student is INACTIVE', async () => {
    mockRepo.findPaymentByIdempotencyKey.mockResolvedValue(null);
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 's1',
      studentCode: 'STU-001',
      fullName: 'Inactive Student',
      status: 'INACTIVE',
    });

    await expect(
      service.collectPayment(actor, {
        studentId: 's1',
        dueId: 'due-1',
        amount: 500,
        mode: 'CASH',
        paymentDate: '2026-05-10',
        idempotencyKey: 'idem-key-1',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('replays existing receipt on idempotent duplicate submit', async () => {
    mockRepo.findPaymentByIdempotencyKey.mockResolvedValue({
      id: 'pay-1',
      receiptNumber: 'REC-2026-00001',
      schoolId: 'SCH-TEST-001',
      studentId: 's1',
      studentCodeSnapshot: 'STU-001',
      studentNameSnapshot: 'Alice',
      amount: 500,
      mode: 'CASH',
      paymentDate: new Date('2026-05-10'),
      status: 'ACTIVE',
      createdAt: new Date(),
      due: { feeMonth: '2026-05', netDue: 1000, paidAmount: 500, balance: 500 },
      school: { name: 'Test School' },
    });

    const receipt = await service.collectPayment(actor, {
      studentId: 's1',
      dueId: 'due-1',
      amount: 500,
      mode: 'CASH',
      paymentDate: '2026-05-10',
      idempotencyKey: 'idem-key-replay',
    });

    expect(receipt.receiptNumber).toBe('REC-2026-00001');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
