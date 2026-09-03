import { Injectable } from '@nestjs/common';
import { SessionRecord } from '@custom-school/contracts';

@Injectable()
export class UserSessionRepository {
  private sessions = new Map<string, SessionRecord>();

  async create(session: SessionRecord): Promise<SessionRecord> {
    this.sessions.set(session.id, { ...session });
    return { ...session };
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    for (const session of this.sessions.values()) {
      if (session.sessionTokenHash === tokenHash) {
        return { ...session };
      }
    }
    return null;
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const session = this.sessions.get(id);
    return session ? { ...session } : null;
  }

  async updateActivity(id: string, lastActiveAt: Date, idleExpiresAt: Date): Promise<SessionRecord | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    session.lastActiveAt = lastActiveAt;
    session.idleExpiresAt = idleExpiresAt;
    return { ...session };
  }

  async revoke(id: string, revokedAt: Date): Promise<SessionRecord | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    session.revokedAt = revokedAt;
    return { ...session };
  }
}
