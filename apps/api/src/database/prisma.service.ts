import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      console.warn('[PrismaService] Could not connect to database — Prisma-dependent features will be unavailable:', (err as Error).message);
    }
  }
  async onModuleDestroy() { await this.$disconnect(); }

  override $transaction(arg: any, options?: any) {
    if (typeof arg === 'function') {
      return super.$transaction(arg, { maxWait: 15000, timeout: 30000, ...options });
    }
    return super.$transaction(arg, options);
  }
}
