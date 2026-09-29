import { Injectable } from '@nestjs/common';
import { Prisma, TransportStatus, AssignmentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type {
  CreateTransportInput,
  UpdateTransportInput,
  CreateTransportStoppageInput,
  UpdateTransportStoppageInput,
  TransportAssignmentDirectoryQueryDto,
} from '@custom-school/contracts';

export const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ');
export const normalizeKey = (name: string): string => normalizeName(name).toLowerCase();

@Injectable()
export class TransportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTransports(schoolId: string) {
    const transports = await this.prisma.transport.findMany({
      where: { schoolId },
      include: {
        stoppages: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            assignments: {
              where: {
                status: AssignmentStatus.ACTIVE,
                student: { status: 'ACTIVE', transportRequired: true },
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    return transports.map(t => ({
      ...t,
      activeAssignmentCount: t._count.assignments,
    }));
  }

  async findTransportById(schoolId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.transport.findFirst({
      where: { schoolId, id },
      include: {
        stoppages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async findTransportByNormalizedName(schoolId: string, normalizedName: string, excludeId?: string) {
    return this.prisma.transport.findFirst({
      where: {
        schoolId,
        normalizedName,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async findTransportByNumber(schoolId: string, transportNumber: string, excludeId?: string) {
    return this.prisma.transport.findFirst({
      where: {
        schoolId,
        transportNumber,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async createTransport(schoolId: string, input: CreateTransportInput) {
    const name = normalizeName(input.name);
    const normalizedName = normalizeKey(name);
    const transportNumber = input.transportNumber.trim();

    return this.prisma.transport.create({
      data: {
        schoolId,
        name,
        normalizedName,
        transportNumber,
        vehicleNumber: input.vehicleNumber ? input.vehicleNumber.trim() : null,
        pickupTime: input.pickupTime ?? null,
        dropTime: input.dropTime ?? null,
        status: TransportStatus.ACTIVE,
        version: 1,
      },
    });
  }

  async updateTransport(schoolId: string, id: string, input: UpdateTransportInput) {
    const updateData: Prisma.TransportUpdateInput = {
      updatedAt: new Date(),
      version: { increment: 1 },
    };

    if (input.name !== undefined) {
      const name = normalizeName(input.name);
      updateData.name = name;
      updateData.normalizedName = normalizeKey(name);
    }
    if (input.transportNumber !== undefined) {
      updateData.transportNumber = input.transportNumber.trim();
    }
    if (input.vehicleNumber !== undefined) {
      updateData.vehicleNumber = input.vehicleNumber ? input.vehicleNumber.trim() : null;
    }
    if (input.pickupTime !== undefined) {
      updateData.pickupTime = input.pickupTime;
    }
    if (input.dropTime !== undefined) {
      updateData.dropTime = input.dropTime;
    }

    return this.prisma.transport.update({
      where: { id },
      data: updateData,
    });
  }

  async updateTransportStatus(schoolId: string, id: string, status: TransportStatus, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.transport.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async countActiveAssignmentsForTransport(schoolId: string, transportId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.transportAssignment.count({
      where: {
        schoolId,
        transportId,
        status: AssignmentStatus.ACTIVE,
        student: { status: 'ACTIVE', transportRequired: true },
      },
    });
  }

  async countActiveAssignmentsForStoppage(schoolId: string, stoppageId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.transportAssignment.count({
      where: {
        schoolId,
        stoppageId,
        status: AssignmentStatus.ACTIVE,
        student: { status: 'ACTIVE', transportRequired: true },
      },
    });
  }

  async listStoppages(schoolId: string, transportId: string) {
    const stoppages = await this.prisma.transportStoppage.findMany({
      where: { schoolId, transportId },
      include: {
        _count: {
          select: {
            assignments: {
              where: {
                status: AssignmentStatus.ACTIVE,
                student: { status: 'ACTIVE', transportRequired: true },
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return stoppages.map(s => ({
      ...s,
      activeAssignmentCount: s._count.assignments,
    }));
  }

  async findStoppageById(schoolId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.transportStoppage.findFirst({
      where: { schoolId, id },
      include: {
        transport: true,
      },
    });
  }

  async findStoppageByName(schoolId: string, transportId: string, normalizedName: string, excludeId?: string) {
    return this.prisma.transportStoppage.findFirst({
      where: {
        schoolId,
        transportId,
        normalizedName,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async createStoppage(schoolId: string, transportId: string, input: CreateTransportStoppageInput) {
    const name = normalizeName(input.name);
    const normalizedName = normalizeKey(name);

    return this.prisma.transportStoppage.create({
      data: {
        schoolId,
        transportId,
        name,
        normalizedName,
        sortOrder: input.sortOrder ?? 0,
        status: TransportStatus.ACTIVE,
        version: 1,
      },
    });
  }

  async updateStoppage(schoolId: string, id: string, input: UpdateTransportStoppageInput) {
    const updateData: Prisma.TransportStoppageUpdateInput = {
      updatedAt: new Date(),
      version: { increment: 1 },
    };

    if (input.name !== undefined) {
      const name = normalizeName(input.name);
      updateData.name = name;
      updateData.normalizedName = normalizeKey(name);
    }
    if (input.sortOrder !== undefined) {
      updateData.sortOrder = input.sortOrder;
    }

    return this.prisma.transportStoppage.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStoppageStatus(schoolId: string, id: string, status: TransportStatus, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.transportStoppage.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  async reorderStoppages(schoolId: string, transportId: string, stoppageIds: string[]) {
    return this.prisma.$transaction(async tx => {
      for (let i = 0; i < stoppageIds.length; i++) {
        await tx.transportStoppage.updateMany({
          where: { schoolId, transportId, id: stoppageIds[i] },
          data: { sortOrder: i, updatedAt: new Date() },
        });
      }
      return tx.transportStoppage.findMany({
        where: { schoolId, transportId },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  async getActiveChoices(schoolId: string) {
    const transports = await this.prisma.transport.findMany({
      where: {
        schoolId,
        status: TransportStatus.ACTIVE,
      },
      include: {
        stoppages: {
          where: { status: TransportStatus.ACTIVE },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      transports: transports.map(t => ({
        id: t.id,
        name: t.name,
        transportNumber: t.transportNumber,
        vehicleNumber: t.vehicleNumber,
        pickupTime: t.pickupTime,
        dropTime: t.dropTime,
        stoppages: t.stoppages.map(s => ({
          id: s.id,
          name: s.name,
          sortOrder: s.sortOrder,
        })),
      })),
    };
  }

  async findActiveAssignmentForStudent(schoolId: string, studentId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.transportAssignment.findFirst({
      where: {
        schoolId,
        studentId,
        status: AssignmentStatus.ACTIVE,
      },
      include: {
        transport: true,
        stoppage: true,
      },
    });
  }

  async findAssignmentById(schoolId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.transportAssignment.findFirst({
      where: { schoolId, id },
      include: {
        transport: true,
        stoppage: true,
      },
    });
  }

  async createAssignment(
    schoolId: string,
    data: {
      studentId: string;
      transportId: string;
      stoppageId: string;
      serviceStartDate?: Date | null;
      serviceEndDate?: Date | null;
      createdBy?: string | null;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.transportAssignment.create({
      data: {
        schoolId,
        studentId: data.studentId,
        transportId: data.transportId,
        stoppageId: data.stoppageId,
        status: AssignmentStatus.ACTIVE,
        serviceStartDate: data.serviceStartDate ?? null,
        serviceEndDate: data.serviceEndDate ?? null,
        startedAt: new Date(),
        createdBy: data.createdBy ?? null,
        version: 1,
      },
      include: {
        transport: true,
        stoppage: true,
      },
    });
  }

  async updateAssignmentStatus(
    schoolId: string,
    id: string,
    data: {
      status: AssignmentStatus;
      endedReason?: string | null;
      endedAt?: Date | null;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    return client.transportAssignment.update({
      where: { id },
      data: {
        status: data.status,
        endedReason: data.endedReason ?? null,
        endedAt: data.endedAt ?? null,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
      include: {
        transport: true,
        stoppage: true,
      },
    });
  }

  async listAssignments(schoolId: string, filter: TransportAssignmentDirectoryQueryDto, studentIds?: string[]) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TransportAssignmentWhereInput = {
      schoolId,
      ...(filter.transportId ? { transportId: filter.transportId } : {}),
      ...(filter.stoppageId ? { stoppageId: filter.stoppageId } : {}),
    };

    if (filter.status === 'ACTIVE') {
      where.status = AssignmentStatus.ACTIVE;
    } else if (filter.status === 'ENDED') {
      where.status = AssignmentStatus.ENDED;
    }

    if (studentIds !== undefined) {
      where.studentId = { in: studentIds };
    }

    const [items, total] = await Promise.all([
      this.prisma.transportAssignment.findMany({
        where,
        include: {
          transport: true,
          stoppage: true,
        },
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.transportAssignment.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async listAllAssignmentsForCounts(schoolId: string) {
    return this.prisma.transportAssignment.findMany({
      where: {
        schoolId,
        status: AssignmentStatus.ACTIVE,
        student: { status: 'ACTIVE', transportRequired: true },
      },
      include: {
        transport: true,
        stoppage: true,
      },
    });
  }

  async listStudentHistory(schoolId: string, studentId: string) {
    return this.prisma.transportAssignment.findMany({
      where: { schoolId, studentId },
      include: {
        transport: true,
        stoppage: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findStudent(schoolId: string, studentId: string) {
    return this.prisma.student.findFirst({
      where: { schoolId, id: studentId },
      select: { id: true, transportRequired: true, transportSetupState: true },
    });
  }

  async withTransaction<T>(cb: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(cb);
  }
}
