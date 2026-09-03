import { Injectable } from '@nestjs/common';

@Injectable()
export class RedisRateLimitAdapter {
  private counters = new Map<string, { count: number; resetAt: number }>();

  async isRateLimited(key: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
    const now = Date.now();
    const entry = this.counters.get(key);

    if (!entry || entry.resetAt < now) {
      this.counters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return false;
    }

    entry.count += 1;
    return entry.count > maxAttempts;
  }

  async reset(key: string): Promise<void> {
    this.counters.delete(key);
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
