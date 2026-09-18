import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private keepAliveTimer?: NodeJS.Timeout;

  constructor() {
    const dbUrl = process.env.DATABASE_URL || '';
    const url = dbUrl && !dbUrl.includes('connection_limit')
      ? `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}connection_limit=5&pool_timeout=30`
      : dbUrl;
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.keepAliveTimer = setInterval(() => {
        this.$queryRaw`SELECT 1`.catch(() => {});
      }, 15000);
    } catch (err) {
      console.warn('[PrismaService] Could not connect to database — Prisma-dependent features will be unavailable:', (err as Error).message);
    }
  }

  async onModuleDestroy() {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    await this.$disconnect();
  }

  override $transaction<R>(
    fn: (prisma: Prisma.TransactionClient) => Promise<R>,
    options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }
  ): Promise<R>;
  override $transaction<P extends Prisma.PrismaPromise<any>[]>(
    arg: [...P],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel }
  ): Promise<any[]>;
  override $transaction(arg: any, options?: any): Promise<any> {
    if (typeof arg === 'function') {
      return super.$transaction(arg, { maxWait: 15000, timeout: 30000, ...options });
    }
    return super.$transaction(arg, options);
  }
}
