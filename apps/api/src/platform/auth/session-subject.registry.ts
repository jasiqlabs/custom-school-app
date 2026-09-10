import { Injectable } from '@nestjs/common';
import type { SessionUserType } from '@custom-school/contracts';
import { ApiError } from '../../common/http/api-error';

export interface SessionSubjectSnapshot {
  userType: SessionUserType;
  userId: string;
  schoolId: string | null;
  accountVersion: number;
  schoolAccessVersion: number | null;
}
export type SessionSubjectValidator = (snapshot: SessionSubjectSnapshot) => Promise<boolean>;

@Injectable()
export class SessionSubjectRegistry {
  private readonly validators = new Map<SessionUserType, SessionSubjectValidator>();
  register(type: SessionUserType, validator: SessionSubjectValidator) { this.validators.set(type, validator); }
  async validate(snapshot: SessionSubjectSnapshot) {
    const validator = this.validators.get(snapshot.userType);
    if (!validator) throw new ApiError(503, 'ERR_AUTH_VALIDATOR_UNAVAILABLE', 'Authentication validator unavailable');
    return validator(snapshot);
  }
}
