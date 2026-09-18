import { StudentsPublicFacadeImpl } from './students-public.facade';

describe('StudentsPublicFacadeImpl', () => {
  let facade: StudentsPublicFacadeImpl;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      student: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn()
      },
      studentEnrollment: {
        count: jest.fn()
      }
    };
    facade = new StudentsPublicFacadeImpl(mockPrisma);
  });

  it('searches students for TC generation in platform admin', async () => {
    mockPrisma.student.findMany.mockResolvedValue([
      {
        id: 'st-1',
        studentCode: 'STU-001',
        fullName: 'Aarav Sharma',
        status: 'ACTIVE',
        enrollments: [{ class: { name: 'Grade 5' }, section: { name: 'A' } }]
      }
    ]);

    const res = await facade.searchForPlatformTc({ schoolId: 'sch-1', query: 'Aarav', limit: 5 });
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('Aarav Sharma');
    expect(res[0].className).toBe('Grade 5');
    expect(res[0].sectionName).toBe('A');
  });

  it('returns population summary with active students count', async () => {
    mockPrisma.student.count.mockResolvedValue(145);

    const summary = await facade.getSchoolPopulationSummary({ schoolId: 'sch-1' });
    expect(summary).toEqual({
      availability: 'AVAILABLE',
      activeStudents: 145
    });
  });

  it('counts active enrollments filtered by class and section', async () => {
    mockPrisma.studentEnrollment.count.mockResolvedValue(32);

    const count = await facade.countActiveEnrollment({
      schoolId: 'sch-1',
      classId: 'cls-1',
      sectionId: 'sec-1'
    });
    expect(count).toBe(32);
    expect(mockPrisma.studentEnrollment.count).toHaveBeenCalledWith({
      where: {
        schoolId: 'sch-1',
        status: 'ACTIVE',
        classId: 'cls-1',
        sectionId: 'sec-1'
      }
    });
  });
});
