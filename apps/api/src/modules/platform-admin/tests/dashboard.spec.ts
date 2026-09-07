import { DashboardService } from '../dashboard/dashboard.service';
import { SchoolsRepository } from '../schools/schools.repository';
import { UsersRepository } from '../users.repository';

describe('US-001-008 Platform School Portfolio Dashboard', () => {
  let dashboardService: DashboardService;
  let schoolsRepository: SchoolsRepository;
  let usersRepository: UsersRepository;

  beforeEach(() => {
    schoolsRepository = new SchoolsRepository();
    usersRepository = new UsersRepository();
    dashboardService = new DashboardService(schoolsRepository, usersRepository);
  });

  it('[VT-001-037] Dashboard shows accurate school portfolio totals', async () => {
    // Clear default seeded school for precise counts
    (schoolsRepository as any).schools.clear();

    const s1 = await schoolsRepository.create({ name: 'School Active 1' });
    await schoolsRepository.update(s1.id, { status: 'ACTIVE' });

    const s2 = await schoolsRepository.create({ name: 'School Active 2' });
    await schoolsRepository.update(s2.id, { status: 'ACTIVE' });

    const s3 = await schoolsRepository.create({ name: 'School Inactive 1' });
    await schoolsRepository.update(s3.id, { status: 'INACTIVE' });

    await schoolsRepository.create({ name: 'School Draft 1' });

    const metrics = await dashboardService.getMetrics();

    expect(metrics.totalSchools).toBe(4);
    expect(metrics.activeSchools).toBe(2);
    expect(metrics.inactiveSchools).toBe(1);
    expect(metrics.draftSchools).toBe(1);
    expect(metrics.generatedAt).toBeDefined();
  });

  it('[VT-001-038] Zero-school platform displays valid empty state with zero counts', async () => {
    // Clear all schools to simulate fresh zero-state
    (schoolsRepository as any).schools.clear();

    const metrics = await dashboardService.getMetrics();
    expect(metrics.totalSchools).toBe(0);
    expect(metrics.activeSchools).toBe(0);
    expect(metrics.inactiveSchools).toBe(0);
    expect(metrics.draftSchools).toBe(0);

    const summary = await dashboardService.getSchoolSummary({});
    expect(summary.items.length).toBe(0);
    expect(summary.total).toBe(0);
  });

  it('[VT-001-039] School summary shows counts without student PII', async () => {
    (schoolsRepository as any).schools.clear();
    const s = await schoolsRepository.create({ name: 'Pinecrest Prep' });
    await schoolsRepository.update(s.id, { status: 'ACTIVE' });

    // Provision an operator
    await usersRepository.create({
      fullName: 'Operator One',
      email: 'op1@pinecrest.edu',
      passwordHash: 'hash',
      role: 'SCHOOL_OPERATOR',
      schoolId: s.id,
      status: 'ACTIVE',
    });

    const summary = await dashboardService.getSchoolSummary({});
    expect(summary.items.length).toBe(1);

    const item = summary.items[0];
    expect(item.name).toBe('Pinecrest Prep');
    expect(item.operatorCount).toBe(1);
    expect(item.studentCount).toBeNull();
    expect(item.studentCountState).toBe('UNAVAILABLE');

    // Verify zero PII leakage
    expect((item as any).students).toBeUndefined();
    expect((item as any).studentList).toBeUndefined();
    expect((item as any).studentNames).toBeUndefined();
  });

  it('[VT-001-040] Dashboard status filter excludes mismatched schools', async () => {
    (schoolsRepository as any).schools.clear();

    const activeSchool = await schoolsRepository.create({ name: 'Active Academy' });
    await schoolsRepository.update(activeSchool.id, { status: 'ACTIVE' });

    const draftSchool = await schoolsRepository.create({ name: 'Draft Academy' });

    const activeOnly = await dashboardService.getSchoolSummary({ status: 'ACTIVE' });
    expect(activeOnly.items.length).toBe(1);
    expect(activeOnly.items[0].name).toBe('Active Academy');

    const draftOnly = await dashboardService.getSchoolSummary({ status: 'DRAFT' });
    expect(draftOnly.items.length).toBe(1);
    expect(draftOnly.items[0].name).toBe('Draft Academy');
  });
});
