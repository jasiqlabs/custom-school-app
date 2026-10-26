import { Controller, Get, UseGuards } from '@nestjs/common';
import { OperatorGuard } from '../../common/security/session.guard';
import { CurrentSession } from '../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { OperatorAuthService } from './operator-auth.service';

@Controller('operator/me')
@UseGuards(OperatorGuard)
export class OperatorMeController {
  constructor(private readonly service: OperatorAuthService) {}

  @Get('capabilities')
  capabilities(@CurrentSession() actor: SessionActor) {
    return this.service.capabilities(actor);
  }
}
