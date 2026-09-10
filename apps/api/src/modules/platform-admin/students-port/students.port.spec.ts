import { UnavailableStudentsFacade } from './students.port';
import { ApiError } from '../../../common/http/api-error';

describe('UnavailableStudentsFacade (fail-closed contract)', () => {
  let facade: UnavailableStudentsFacade;

  beforeEach(() => {
    facade = new UnavailableStudentsFacade();
  });

  it('fails closed with 503 on searchForPlatformTc', async () => {
    await expect(
      facade.searchForPlatformTc({ schoolId: 'school-1', query: 'John', limit: 10 })
    ).rejects.toThrow(ApiError);

    try {
      await facade.searchForPlatformTc({ schoolId: 'school-1', query: 'John', limit: 10 });
    } catch (e: any) {
      expect(e.status).toBe(503);
      expect(e.code).toBe('ERR_STUDENT_CAPABILITY_UNAVAILABLE');
    }
  });

  it('fails closed with 503 on getTcSnapshot', async () => {
    await expect(
      facade.getTcSnapshot({ schoolId: 'school-1', studentId: 'student-1' })
    ).rejects.toThrow(ApiError);

    try {
      await facade.getTcSnapshot({ schoolId: 'school-1', studentId: 'student-1' });
    } catch (e: any) {
      expect(e.status).toBe(503);
      expect(e.code).toBe('ERR_STUDENT_CAPABILITY_UNAVAILABLE');
    }
  });

  it('fails closed with 503 on countActiveEnrollment', async () => {
    await expect(
      facade.countActiveEnrollment({ schoolId: 'school-1', classId: 'class-1' })
    ).rejects.toThrow(ApiError);

    try {
      await facade.countActiveEnrollment({ schoolId: 'school-1', classId: 'class-1' });
    } catch (e: any) {
      expect(e.status).toBe(503);
      expect(e.code).toBe('ERR_STUDENT_CAPABILITY_UNAVAILABLE');
    }
  });

  it('returns UNAVAILABLE for school population summary without fabricating numbers', async () => {
    const summary = await facade.getSchoolPopulationSummary({ schoolId: 'school-1' });
    expect(summary).toEqual({ availability: 'UNAVAILABLE' });
  });
});
