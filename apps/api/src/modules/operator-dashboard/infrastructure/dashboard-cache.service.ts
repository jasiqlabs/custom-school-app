import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class DashboardCacheService {
  private readonly store = new Map<string, CacheEntry<any>>();

  private buildKey(schoolId: string, widget: string, filterKey: string): string {
    return `${schoolId}:${widget}:${filterKey || 'default'}`;
  }

  get<T>(schoolId: string, widget: string, filterKey = ''): T | undefined {
    const key = this.buildKey(schoolId, widget, filterKey);
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(schoolId: string, widget: string, filterKey: string, data: T, ttlSeconds = 30): void {
    const key = this.buildKey(schoolId, widget, filterKey);
    const expiresAt = Date.now() + Math.min(Math.max(ttlSeconds, 1), 30) * 1000;
    this.store.set(key, { value: data, expiresAt });

    // Periodic sweep if store gets large
    if (this.store.size > 2000) {
      const now = Date.now();
      for (const [k, v] of this.store.entries()) {
        if (now > v.expiresAt) {
          this.store.delete(k);
        }
      }
    }
  }

  clear(schoolId?: string): void {
    if (!schoolId) {
      this.store.clear();
      return;
    }
    const prefix = `${schoolId}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}
