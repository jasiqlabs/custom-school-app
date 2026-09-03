import { TenantContextService } from '../services/tenant-context.service';

/**
 * Base Tenant-Scoped Repository
 * Automatically injects schoolId filter from TenantContext into query parameters.
 */
export abstract class TenantRepository<T> {
  constructor(protected readonly tenantContextService: TenantContextService) {}

  protected getActiveSchoolId(): string {
    return this.tenantContextService.getRequiredContext().schoolId;
  }

  /**
   * Enforces tenant-isolation filter on arbitrary query criteria.
   */
  protected withTenantScope<P extends Record<string, unknown>>(params: P): P & { schoolId: string } {
    const schoolId = this.getActiveSchoolId();
    return {
      ...params,
      schoolId,
    };
  }

  /**
   * Asserts that a retrieved entity belongs to current active schoolId.
   * Returns entity if match, otherwise returns null without leaking entity existence.
   */
  protected filterByTenant(entity: { schoolId: string } | null): T | null {
    if (!entity) return null;
    const currentSchoolId = this.getActiveSchoolId();
    if (entity.schoolId !== currentSchoolId) {
      return null;
    }
    return entity as unknown as T;
  }
}
