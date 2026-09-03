import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  CreateSessionDto,
  SessionRecord,
  SessionValidationResult,
} from '@custom-school/contracts';
import { UserSessionRepository } from '../repositories/user-session.repository';

@Injectable()
export class SessionService {
  private readonly ADMIN_TTL_HOURS = 4;
  private readonly OPERATOR_TTL_HOURS = 8;
  private readonly IDLE_TTL_MINUTES = 30;

  constructor(private readonly sessionRepository: UserSessionRepository) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createSession(dto: CreateSessionDto): Promise<{ token: string; session: SessionRecord }> {
    // BR-AUTH-002: Operator sessions must carry a schoolId
    if (dto.role === 'SCHOOL_OPERATOR' && !dto.schoolId) {
      throw new BadRequestException('SCHOOL_OPERATOR role requires a valid schoolId (BR-AUTH-002)');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const now = new Date();
    const ttlHours = dto.role === 'PLATFORM_ADMIN' ? this.ADMIN_TTL_HOURS : this.OPERATOR_TTL_HOURS;
    const expiresAt = new Date(now.getTime() + ttlHours * 3600 * 1000);
    const idleExpiresAt = new Date(now.getTime() + this.IDLE_TTL_MINUTES * 60 * 1000);

    const session: SessionRecord = {
      id: crypto.randomUUID(),
      sessionTokenHash: tokenHash,
      userId: dto.userId,
      schoolId: dto.schoolId || null,
      role: dto.role,
      expiresAt,
      idleExpiresAt,
      lastActiveAt: now,
      revokedAt: null,
      createdAt: now,
      userAgent: dto.userAgent,
      ipHash: dto.ipHash,
    };

    const saved = await this.sessionRepository.create(session);
    return { token: rawToken, session: saved };
  }

  async validateSession(rawToken: string): Promise<SessionValidationResult> {
    if (!rawToken || rawToken.trim() === '') {
      return { status: 'INVALID' };
    }

    const tokenHash = this.hashToken(rawToken);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      return { status: 'INVALID' };
    }

    if (session.revokedAt) {
      return { status: 'REVOKED' };
    }

    const now = new Date();
    if (session.expiresAt <= now || session.idleExpiresAt <= now) {
      return { status: 'EXPIRED' };
    }

    // Slide idle window
    const newIdleExpiresAt = new Date(now.getTime() + this.IDLE_TTL_MINUTES * 60 * 1000);
    const updated = await this.sessionRepository.updateActivity(session.id, now, newIdleExpiresAt);

    return {
      status: 'VALID',
      session: updated || session,
      schoolId: session.schoolId || undefined,
      role: session.role,
      userId: session.userId,
    };
  }

  async revokeSession(id: string): Promise<SessionRecord | null> {
    return this.sessionRepository.revoke(id, new Date());
  }
}
