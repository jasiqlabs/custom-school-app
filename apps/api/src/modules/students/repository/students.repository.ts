import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { StudentDirectoryQuery, StudentDirectoryResponse, StudentDirectoryItem } from '@custom-school/contracts';

@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(schoolId: string, studentId: string) {
    return this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        privateProfile: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { class: true, section: true },
          take: 1
        }
      }
    });
  }

  async findByNormalizedCode(schoolId: string, normalizedCode: string) {
    return this.prisma.student.findUnique({
      where: {
        schoolId_normalizedCode: { schoolId, normalizedCode }
      }
    });
  }

  async search(schoolId: string, query: string, limit: number = 20) {
    const trimmed = query.trim();
    const normalized = trimmed.toUpperCase().replace(/\s+/g, '');

    // Priority 1: Exact normalized code match
    const exactCode = await this.prisma.student.findFirst({
      where: { schoolId, normalizedCode: normalized },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { class: true, section: true },
          take: 1
        }
      }
    });

    if (exactCode) {
      const activeEnrollment = exactCode.enrollments[0];
      return [
        {
          id: exactCode.id,
          studentCode: exactCode.studentCode,
          fullName: exactCode.fullName,
          className: activeEnrollment?.class?.name ?? 'Unassigned',
          sectionName: activeEnrollment?.section?.name ?? 'Unassigned',
          gender: exactCode.gender,
          status: exactCode.status
        }
      ];
    }

    // Priority 2: Trigram / prefix search on normalizedName
    const normalizedQuery = trimmed.toLowerCase();
    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        OR: [
          { normalizedName: { contains: normalizedQuery } },
          { normalizedCode: { contains: normalized } }
        ]
      },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { class: true, section: true },
          take: 1
        }
      },
      take: Math.min(limit, 50),
      orderBy: { fullName: 'asc' }
    });

    return students.map(s => {
      const activeEnrollment = s.enrollments[0];
      return {
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        className: activeEnrollment?.class?.name ?? 'Unassigned',
        sectionName: activeEnrollment?.section?.name ?? 'Unassigned',
        gender: s.gender,
        status: s.status
      };
    });
  }

  async findDirectory(
    schoolId: string,
    filters: {
      page?: number;
      limit?: number;
      classId?: string;
      sectionId?: string;
      gender?: 'BOY' | 'GIRL';
      status?: 'ACTIVE' | 'INACTIVE';
      search?: string;
    }
  ): Promise<StudentDirectoryResponse> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = { schoolId };

    if (filters.gender) {
      where.gender = filters.gender;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search && filters.search.trim().length > 0) {
      const q = filters.search.trim().toLowerCase();
      const codeQ = filters.search.trim().toUpperCase().replace(/\s+/g, '');
      where.OR = [
        { normalizedName: { contains: q } },
        { normalizedCode: { contains: codeQ } }
      ];
    }

    if (filters.classId || filters.sectionId) {
      where.enrollments = {
        some: {
          status: 'ACTIVE',
          ...(filters.classId ? { classId: filters.classId } : {}),
          ...(filters.sectionId ? { sectionId: filters.sectionId } : {})
        }
      };
    }

    const [total, records] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            include: { class: true, section: true },
            take: 1
          }
        },
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { fullName: 'asc' }]
      })
    ]);

    const items: StudentDirectoryItem[] = records.map(r => {
      const activeEnrollment = r.enrollments[0];
      return {
        id: r.id,
        studentCode: r.studentCode,
        fullName: r.fullName,
        classId: activeEnrollment?.classId ?? '',
        className: activeEnrollment?.class?.name ?? 'Unassigned',
        sectionId: activeEnrollment?.sectionId ?? '',
        sectionName: activeEnrollment?.section?.name ?? 'Unassigned',
        gender: r.gender,
        status: r.status as 'ACTIVE' | 'INACTIVE',
        admissionDate: r.admissionDate.toISOString().split('T')[0],
        transportRequired: r.transportRequired,
        photoFileId: r.photoFileId
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getIdentifierHistory(schoolId: string, studentId: string) {
    return this.prisma.studentIdentifierHistory.findMany({
      where: { schoolId, studentId },
      orderBy: { changedAt: 'desc' }
    });
  }
}
