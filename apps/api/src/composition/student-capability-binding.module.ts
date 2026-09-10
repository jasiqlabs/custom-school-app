import { Global, Module } from '@nestjs/common';
import { STUDENTS_PUBLIC_FACADE, UnavailableStudentsFacade } from '../modules/platform-admin/students-port/students.port';

@Global()
@Module({ providers: [{ provide: STUDENTS_PUBLIC_FACADE, useClass: UnavailableStudentsFacade }], exports: [STUDENTS_PUBLIC_FACADE] })
export class StudentCapabilityBindingModule {}
