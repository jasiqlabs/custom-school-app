import { Injectable } from '@nestjs/common';

export interface LoginAttemptRecord {
  id: string;
  identifier: string;
  ipAddress: string;
  attemptedAt: Date;
  success: boolean;
  failureReason?: string;
}

@Injectable()
export class LoginAttemptRepository {
  private attempts: LoginAttemptRecord[] = [];

  async record(attempt: LoginAttemptRecord): Promise<LoginAttemptRecord> {
    this.attempts.push({ ...attempt });
    return { ...attempt };
  }

  async countRecentFailed(identifier: string, windowSeconds: number): Promise<number> {
    const cutoff = new Date(Date.now() - windowSeconds * 1000);
    return this.attempts.filter(
      (a) => a.identifier === identifier && !a.success && a.attemptedAt >= cutoff
    ).length;
  }
}
