import type { StudentsPublicFacade, TcStudentSearchResult, TcStudentSnapshot } from '@custom-school/contracts';
import { ApiError } from '../../../common/http/api-error';
export const STUDENTS_PUBLIC_FACADE=Symbol('STUDENTS_PUBLIC_FACADE');
export class UnavailableStudentsFacade implements StudentsPublicFacade {
  async searchForPlatformTc(_input:{schoolId:string;query:string;limit:number}):Promise<TcStudentSearchResult[]>{throw new ApiError(503,'ERR_STUDENT_CAPABILITY_UNAVAILABLE','Student capability is not available yet');}
  async getTcSnapshot(_input:{schoolId:string;studentId:string}):Promise<TcStudentSnapshot|null>{throw new ApiError(503,'ERR_STUDENT_CAPABILITY_UNAVAILABLE','Student capability is not available yet');}
  async countActiveEnrollment(_input:{schoolId:string;classId?:string;sectionId?:string}):Promise<number>{throw new ApiError(503,'ERR_STUDENT_CAPABILITY_UNAVAILABLE','Student capability is not available yet');}
  async getSchoolPopulationSummary(_input:{schoolId:string}){return {availability:'UNAVAILABLE' as const};}
}
