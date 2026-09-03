import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from '@custom-school/contracts';
import { TenantBoundaryException } from '../errors';

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  runWithContext<T>(context: TenantContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  getContext(): TenantContext | undefined {
    return this.storage.getStore();
  }

  getRequiredContext(): TenantContext {
    const ctx = this.getContext();
    if (!ctx || !ctx.schoolId) {
      throw new TenantBoundaryException('Missing tenant context in execution scope');
    }
    return ctx;
  }

  assertResourceInTenant(resourceSchoolId: string): void {
    const ctx = this.getRequiredContext();
    if (ctx.schoolId !== resourceSchoolId) {
      throw new TenantBoundaryException(
        `Cross-tenant access denied: resource schoolId ${resourceSchoolId} does not match active tenant ${ctx.schoolId}`
      );
    }
  }
}
