import { Injectable } from '@nestjs/common';
import { SchoolsRepository } from '../schools/schools.repository';
import { UsersRepository } from '../users.repository';
import {
  PlatformDashboardMetricsResponse,
  PlatformSchoolSummaryResponse,
} from '@custom-school/contracts';

@Injectable()
export class DashboardService {
  constructor(
    private readonly schoolsRepository: SchoolsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async getMetrics(): Promise<PlatformDashboardMetricsResponse> {
    const allSchools = (await this.schoolsRepository.findAll({ limit: 1000 })).items;

    let activeSchools = 0;
    let inactiveSchools = 0;
    let draftSchools = 0;

    for (const s of allSchools) {
      if (s.status === 'ACTIVE') activeSchools++;
      else if (s.status === 'INACTIVE') inactiveSchools++;
      else if (s.status === 'DRAFT') draftSchools++;
    }

    return {
      totalSchools: allSchools.length,
      activeSchools,
      inactiveSchools,
      draftSchools,
      generatedAt: new Date().toISOString(),
    };
  }

  async getSchoolSummary(query: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PlatformSchoolSummaryResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 25));

    const result = await this.schoolsRepository.findAll({
      page,
      limit,
      status: query.status,
    });

    const items = await Promise.all(
      result.items.map(async (school) => {
        const operatorCount = await this.usersRepository.countBySchoolId(school.id);

        return {
          schoolId: school.id,
          schoolUuid: school.schoolUuid,
          name: school.name,
          status: school.status,
          operatorCount,
          studentCount: null, // MOD-002 downstream, zero PII
          studentCountState: 'UNAVAILABLE' as const,
          lastActivityAt: school.updatedAt ? school.updatedAt.toISOString() : null,
        };
      }),
    );

    return {
      items,
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
  }
}
