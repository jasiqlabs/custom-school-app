import { Global, Module } from '@nestjs/common';
import { STUDENTS_PUBLIC_FACADE } from '../modules/platform-admin/students-port/students.port';
import { StudentsPublicFacadeImpl } from '../modules/students/facade/students-public.facade';

@Global()
@Module({
  providers: [
    {
      provide: STUDENTS_PUBLIC_FACADE,
      useClass: StudentsPublicFacadeImpl
    }
  ],
  exports: [STUDENTS_PUBLIC_FACADE]
})
export class StudentCapabilityBindingModule {}

