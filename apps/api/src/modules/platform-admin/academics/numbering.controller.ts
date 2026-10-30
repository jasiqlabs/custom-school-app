import { BadRequestException, ConflictException, Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../../database/prisma.service';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import { CapabilityGuard, RequiresCapability } from '../../../common/security/capability.guard';
import type { SessionActor } from '@custom-school/contracts';

const bodySchema = z.object({
  version: z.number().int().min(1),
  receiptNumberPolicy: z.enum(['LEGACY','CONTINUOUS','ACADEMIC_YEAR','FINANCIAL_YEAR']),
  receiptNumberPrefix: z.string().trim().regex(/^[A-Z0-9_-]{2,12}$/),
  studentNumberPolicy: z.enum(['LEGACY','CONTINUOUS','ACADEMIC_YEAR','FINANCIAL_YEAR']),
  studentNumberPrefix: z.string().trim().regex(/^[A-Z0-9_-]{2,12}$/),
});
@Controller('operator/numbering')
@UseGuards(OperatorGuard, CapabilityGuard)
export class NumberingController {
  constructor(private readonly db: PrismaService) {}
  @Get()
  @RequiresCapability('academics.read')
  async get(@CurrentSession() actor: SessionActor) {
    const s = await this.db.school.findUnique({ where: { id: actor.schoolId! },
      select: { version:true, receiptNumberPolicy:true, receiptNumberPrefix:true,
        studentNumberPolicy:true, studentNumberPrefix:true } });
    if (!s) throw new BadRequestException('School not found');
    return s;
  }
  @Patch()
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  async update(@CurrentSession() actor: SessionActor, @Body() body: unknown) {
    const input=bodySchema.parse(body);
    const result=await this.db.school.updateMany({
      where: { id: actor.schoolId!, version: input.version },
      data: {
        receiptNumberPolicy:input.receiptNumberPolicy, receiptNumberPrefix:input.receiptNumberPrefix,
        studentNumberPolicy:input.studentNumberPolicy, studentNumberPrefix:input.studentNumberPrefix,
        version: { increment: 1 },
      },
    });
    if (!result.count) throw new ConflictException('Settings changed. Refresh before saving.');
    return this.get(actor);
  }
}
