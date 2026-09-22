import { Injectable, BadRequestException } from '@nestjs/common';
import { FeesRepository } from '../repository/fees.repository';
import type {
  FeePaymentFilterDto,
  FeePaymentDto,
} from '@custom-school/contracts';

@Injectable()
export class QueryPaymentsService {
  constructor(private readonly feesRepository: FeesRepository) {}

  async listPayments(
    schoolId: string,
    filter: FeePaymentFilterDto
  ): Promise<{
    items: FeePaymentDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!schoolId) {
      throw new BadRequestException('School ID is required');
    }

    const { total, items, page, limit } = await this.feesRepository.findPayments(
      schoolId,
      filter
    );

    return {
      total,
      page,
      limit,
      items: items.map((p) => ({
        id: p.id,
        schoolId: p.schoolId,
        dueId: p.dueId,
        studentId: p.studentId,
        receiptNumber: p.receiptNumber,
        studentCodeSnapshot: p.studentCodeSnapshot,
        studentNameSnapshot: p.studentNameSnapshot,
        amount: Number(p.amount),
        mode: p.mode as any,
        paymentDate: p.paymentDate.toISOString().slice(0, 10),
        reference: p.reference,
        status: p.status as any,
        createdAt: p.createdAt.toISOString(),
        voidedAt: p.voidedAt?.toISOString(),
        voidReason: p.voidReason,
        voidedBy: p.voidedBy,
      })),
    };
  }
}
