import { BadRequestException, ConflictException, Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { StudentDomainValidator } from '../domain/student.validator';
import { SensitiveFieldCryptoService } from '../../../platform/crypto/sensitive-field-crypto.service';
import { FEES_PUBLIC_FACADE, FeesPublicFacade } from '../ports/fees.port';
import type { SessionActor, UpdateStudentProfileInput } from '@custom-school/contracts';

@Injectable()
export class UpdateStudentProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly validator: StudentDomainValidator,
    private readonly crypto: SensitiveFieldCryptoService,
    @Optional() @Inject(FEES_PUBLIC_FACADE) private readonly feesFacade?: FeesPublicFacade
  ) {}

  async update(actor: SessionActor, studentId: string, input: UpdateStudentProfileInput) {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    let classChanged = false;
    let concessionChanged = false;
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.student.findFirst({
        where: { id: studentId, schoolId },
        include: {
          enrollments: { where: { status: 'ACTIVE' }, take: 1 },
          privateProfile: true
        }
      });

      if (!existing) {
        throw new NotFoundException('Student not found in this school');
      }

      if (existing.version !== input.version) {
        throw new ConflictException({
          code: 'ERR_STUDENT_VERSION_CONFLICT',
          message: 'Student profile has been modified concurrently. Please refresh the page and try again.',
          currentVersion: existing.version
        });
      }

      const updateData: any = {
        version: existing.version + 1
      };

      if (input.fullName !== undefined) {
        updateData.fullName = input.fullName.trim();
        updateData.normalizedName = input.fullName.trim().toLowerCase();
      }
      if (input.fatherName !== undefined) updateData.fatherName = input.fatherName.trim();
      if (input.motherName !== undefined) updateData.motherName = input.motherName.trim();
      if (input.familyCode !== undefined) updateData.familyCode = input.familyCode?.trim() || null;
      if (input.tallyLedgerName !== undefined) updateData.tallyLedgerName = input.tallyLedgerName?.trim() || null;
      if (input.dob !== undefined) updateData.dob = this.validator.validateDob(input.dob);
      if (input.admissionDate !== undefined) {
        const parsed = new Date(input.admissionDate);
        if (isNaN(parsed.getTime())) throw new BadRequestException('Invalid admission date');
        updateData.admissionDate = parsed;
      }
      if (input.gender !== undefined) updateData.gender = input.gender;
      if (input.address !== undefined) updateData.address = input.address.trim();
      if (input.phone !== undefined) updateData.phone = input.phone.trim();
      if (input.email !== undefined) updateData.email = input.email?.trim().toLowerCase() || null;
      if (input.emergencyContact !== undefined) updateData.emergencyContact = input.emergencyContact.trim();
      if (input.emergencyRelation !== undefined) updateData.emergencyRelation = input.emergencyRelation.trim();
      if (input.penNumber !== undefined) updateData.penNumber = input.penNumber?.trim() || null;
      if (input.udiseCode !== undefined) updateData.udiseCode = input.udiseCode?.trim() || null;
      if (input.previousSchool !== undefined) updateData.previousSchool = input.previousSchool?.trim() || null;
      if (input.previousTcNumber !== undefined) updateData.previousTcNumber = input.previousTcNumber?.trim() || null;
      if (input.bloodGroup !== undefined) updateData.bloodGroup = input.bloodGroup?.trim() || null;
      if (input.nationality !== undefined) updateData.nationality = input.nationality?.trim() || 'Indian';
      if (input.hobbies !== undefined) updateData.hobbies = input.hobbies?.trim() || null;
      if (input.achievements !== undefined) updateData.achievements = input.achievements?.trim() || null;

      if (input.concession !== undefined) {
        const prevType = existing.concessionType || 'NONE';
        const prevVal = Number(existing.concessionValue || 0);
        const nextType = input.concession.type;
        const nextVal = Number(input.concession.value || 0);

        if (prevType !== nextType || prevVal !== nextVal) {
          concessionChanged = true;
        }
        this.validator.validateConcession(input.concession.type, input.concession.value);
        updateData.concessionType = input.concession.type;
        updateData.concessionValue = input.concession.value;
      }

      if (input.photoFileId !== undefined) {
        await this.validator.validatePhotoFile(tx, schoolId, input.photoFileId);
        updateData.photoFileId = input.photoFileId || null;
      }

      const isTransportReqSpecified = input.transportRequired !== undefined;
      const isTransportReq = isTransportReqSpecified ? input.transportRequired : existing.transportRequired;

      if (isTransportReqSpecified || (input.stoppageId !== undefined && isTransportReq)) {
        updateData.transportRequired = isTransportReq;

        if (!isTransportReq) {
          // If operator removes transport requirement
          updateData.transportSetupState = 'NOT_REQUIRED';
          // End any active transport assignments for this student
          const activeAssignments = await tx.transportAssignment.findMany({
            where: {
              schoolId,
              studentId,
              status: 'ACTIVE',
            },
          });
          const now = new Date();
          for (const asgn of activeAssignments) {
            await tx.transportAssignment.update({
              where: { id: asgn.id },
              data: {
                status: 'ENDED',
                endedAt: now,
                serviceEndDate: asgn.serviceEndDate || now,
                endedReason: 'Transport requirement removed in student profile',
                updatedAt: now,
                version: { increment: 1 },
              },
            });
          }
        } else {
          // If operator enables or updates transport requirement
          let targetStoppage: { id: string; transportId: string } | null = null;

          if (input.stoppageId) {
            const stoppage = await tx.transportStoppage.findFirst({
              where: { id: input.stoppageId, schoolId, status: 'ACTIVE' },
              include: { transport: true },
            });
            if (stoppage && stoppage.transport.status === 'ACTIVE') {
              targetStoppage = { id: stoppage.id, transportId: stoppage.transportId };
            }
          }

          if (!targetStoppage) {
            // Check if student already has an active assignment
            const activeAsgn = await tx.transportAssignment.findFirst({
              where: { schoolId, studentId, status: 'ACTIVE' },
              include: { transport: true, stoppage: true },
            });
            if (activeAsgn && activeAsgn.transport.status === 'ACTIVE' && activeAsgn.stoppage.status === 'ACTIVE') {
              targetStoppage = { id: activeAsgn.stoppageId, transportId: activeAsgn.transportId };
            }
          }

          if (!targetStoppage) {
            // Check previous ended/historical assignment for this student
            const prevAsgn = await tx.transportAssignment.findFirst({
              where: { schoolId, studentId },
              orderBy: { createdAt: 'desc' },
              include: { transport: true, stoppage: true },
            });
            if (prevAsgn && prevAsgn.transport.status === 'ACTIVE' && prevAsgn.stoppage.status === 'ACTIVE') {
              targetStoppage = { id: prevAsgn.stoppageId, transportId: prevAsgn.transportId };
            }
          }

          if (!targetStoppage) {
            // Fallback to first active stoppage of an active route in the school
            const defaultStoppage = await tx.transportStoppage.findFirst({
              where: { schoolId, status: 'ACTIVE', transport: { status: 'ACTIVE' } },
              include: { transport: true },
              orderBy: { sortOrder: 'asc' },
            });
            if (defaultStoppage) {
              targetStoppage = { id: defaultStoppage.id, transportId: defaultStoppage.transportId };
            }
          }

          if (targetStoppage) {
            const now = new Date();
            const existingActive = await tx.transportAssignment.findFirst({
              where: { schoolId, studentId, status: 'ACTIVE' },
            });

            if (existingActive && existingActive.stoppageId === targetStoppage.id && existingActive.transportId === targetStoppage.transportId) {
              updateData.transportSetupState = 'ACTIVE';
            } else {
              if (existingActive) {
                await tx.transportAssignment.update({
                  where: { id: existingActive.id },
                  data: {
                    status: 'ENDED',
                    endedAt: now,
                    serviceEndDate: existingActive.serviceEndDate || now,
                    endedReason: 'Replaced by new assignment in student profile',
                    updatedAt: now,
                    version: { increment: 1 },
                  },
                });
              }
              await tx.transportAssignment.create({
                data: {
                  schoolId,
                  studentId,
                  transportId: targetStoppage.transportId,
                  stoppageId: targetStoppage.id,
                  status: 'ACTIVE',
                  serviceStartDate: input.serviceStartDate ? new Date(input.serviceStartDate) : now,
                  serviceEndDate: input.serviceEndDate ? new Date(input.serviceEndDate) : null,
                  startedAt: now,
                  createdBy: actor.userId,
                  version: 1,
                },
              });
              updateData.transportSetupState = 'ACTIVE';
            }
          } else {
            updateData.transportSetupState = 'SETUP_PENDING';
          }
        }
      }

      // Handle class/section re-enrollment if changed
      const currentEnrollment = existing.enrollments[0];
      const targetClassId = input.classId ?? currentEnrollment?.classId;
      const targetSectionId = input.sectionId ?? currentEnrollment?.sectionId;

      if (
        (input.classId && input.classId !== currentEnrollment?.classId) ||
        (input.sectionId && input.sectionId !== currentEnrollment?.sectionId)
      ) {
        if (!targetClassId || !targetSectionId) {
          throw new ConflictException('Both class and section must be specified for enrollment change');
        }
        await this.validator.validateAcademics(tx, schoolId, targetClassId, targetSectionId);

        if (input.classId && input.classId !== currentEnrollment?.classId) {
          classChanged = true;
        }

        if (currentEnrollment) {
          await tx.studentEnrollment.update({
            where: { id: currentEnrollment.id },
            data: { status: 'ENDED', endedAt: new Date() }
          });
        }

        await tx.studentEnrollment.create({
          data: {
            schoolId,
            studentId,
            classId: targetClassId,
            sectionId: targetSectionId,
            status: 'ACTIVE',
            startedAt: new Date()
          }
        });
      }

      const updated = await tx.student.update({
        where: { id: studentId },
        data: updateData
      });

      if (
        input.aadhaarNumber !== undefined ||
        input.panNumber !== undefined ||
        input.bank !== undefined ||
        input.religion !== undefined ||
        input.caste !== undefined ||
        input.disability !== undefined ||
        input.medicalConditions !== undefined ||
        input.allergies !== undefined
      ) {
        let currentPrivateData: any = {};
        if (existing.privateProfile) {
          try {
            const envelope = JSON.parse(existing.privateProfile.encryptedPayload);
            currentPrivateData = this.crypto.decryptJson(envelope, { schoolId, studentId });
          } catch {
            currentPrivateData = {};
          }
        }

        let aadhaarLast4 = existing.privateProfile?.aadhaarLast4 || null;
        if (input.aadhaarNumber !== undefined && input.aadhaarNumber !== null && input.aadhaarNumber.trim() !== '') {
          const cleanAadhaar = input.aadhaarNumber.replace(/[\s-]/g, '');
          currentPrivateData.aadhaarNumber = cleanAadhaar;
          aadhaarLast4 = cleanAadhaar.slice(-4);
        }
        if (input.panNumber !== undefined && input.panNumber !== null && input.panNumber.trim() !== '') {
          currentPrivateData.panNumber = input.panNumber.trim().toUpperCase();
        }
        if (input.bank !== undefined) {
          if (input.bank) {
            const prevBank = currentPrivateData.bank || {};
            currentPrivateData.bank = {
              bankName: input.bank.bankName !== undefined && input.bank.bankName !== null && input.bank.bankName.trim() !== ''
                ? input.bank.bankName.trim()
                : prevBank.bankName,
              accountHolderName: input.bank.accountHolderName !== undefined && input.bank.accountHolderName !== null && input.bank.accountHolderName.trim() !== ''
                ? input.bank.accountHolderName.trim()
                : prevBank.accountHolderName,
              accountNumber: input.bank.accountNumber !== undefined && input.bank.accountNumber !== null && input.bank.accountNumber.trim() !== ''
                ? input.bank.accountNumber.trim()
                : prevBank.accountNumber,
              ifsc: input.bank.ifsc !== undefined && input.bank.ifsc !== null && input.bank.ifsc.trim() !== ''
                ? input.bank.ifsc.trim().toUpperCase()
                : prevBank.ifsc,
              branch: input.bank.branch !== undefined && input.bank.branch !== null && input.bank.branch.trim() !== ''
                ? input.bank.branch.trim()
                : prevBank.branch,
            };
          } else {
            currentPrivateData.bank = null;
          }
        }
        if (input.religion !== undefined) {
          currentPrivateData.religion = input.religion?.trim() || null;
        }
        if (input.caste !== undefined) {
          currentPrivateData.caste = input.caste?.trim() || null;
        }
        if (input.disability !== undefined) {
          currentPrivateData.disability = input.disability || null;
        }
        if (input.medicalConditions !== undefined) {
          currentPrivateData.medicalConditions = input.medicalConditions?.trim() || null;
        }
        if (input.allergies !== undefined) {
          currentPrivateData.allergies = input.allergies?.trim() || null;
        }

        const encrypted = this.crypto.encryptJson(currentPrivateData, { schoolId, studentId });
        if (existing.privateProfile) {
          await tx.studentPrivateProfile.update({
            where: { id: existing.privateProfile.id },
            data: {
              encryptedPayload: JSON.stringify(encrypted),
              keyVersion: encrypted.keyVersion,
              ...(aadhaarLast4 ? { aadhaarLast4 } : {})
            }
          });
        } else {
          await tx.studentPrivateProfile.create({
            data: {
              schoolId,
              studentId,
              encryptedPayload: JSON.stringify(encrypted),
              keyVersion: encrypted.keyVersion,
              aadhaarLast4: aadhaarLast4 || '0000'
            }
          });
        }
      }

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'STUDENT_PROFILE_UPDATED',
          targetType: 'STUDENT',
          targetId: studentId,
          metadata: {
            previousVersion: existing.version,
            newVersion: updated.version,
            classId: targetClassId,
            sectionId: targetSectionId
          }
        },
        tx
      );

      return {
        id: updated.id,
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString()
      };
    });

    if (this.feesFacade) {
      if (concessionChanged || input.concession !== undefined) {
        await this.feesFacade.syncConcessionDues({ schoolId, studentId });
      }
      if (classChanged) {
        await this.feesFacade.ensureStudentDues({ schoolId, studentId });
      }
    }

    return result;
  }
}
