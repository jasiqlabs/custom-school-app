import { Module } from '@nestjs/common';
import { StudentsController } from './controllers/students.controller';
import { StudentImportController } from './controllers/student-import.controller';

import { AdmitStudentService } from './application/admit-student.service';
import { UpdateStudentProfileService } from './application/update-student-profile.service';
import { ChangeStudentIdentifierService } from './application/change-student-identifier.service';
import { ChangeStudentStatusService } from './application/change-student-status.service';
import { SearchStudentsService } from './application/search-students.service';
import { StudentImportService } from './application/student-import.service';

import { StudentIdentifierAllocator } from './domain/student-identifier-allocator';
import { StudentDomainValidator } from './domain/student.validator';
import { StudentsRepository } from './repository/students.repository';
import { StudentsPublicFacadeImpl } from './facade/students-public.facade';

import { FEES_PUBLIC_FACADE, UnavailableFeesFacade } from './ports/fees.port';
import { TRANSPORT_PUBLIC_FACADE, UnavailableTransportFacade } from './ports/transport.port';

@Module({
  controllers: [StudentsController, StudentImportController],
  providers: [
    AdmitStudentService,
    UpdateStudentProfileService,
    ChangeStudentIdentifierService,
    ChangeStudentStatusService,
    SearchStudentsService,
    StudentImportService,
    StudentIdentifierAllocator,
    StudentDomainValidator,
    StudentsRepository,
    StudentsPublicFacadeImpl,
    {
      provide: FEES_PUBLIC_FACADE,
      useClass: UnavailableFeesFacade
    },
    {
      provide: TRANSPORT_PUBLIC_FACADE,
      useClass: UnavailableTransportFacade
    }
  ],
  exports: [
    StudentsPublicFacadeImpl,
    AdmitStudentService,
    SearchStudentsService
  ]
})
export class StudentsModule {}
