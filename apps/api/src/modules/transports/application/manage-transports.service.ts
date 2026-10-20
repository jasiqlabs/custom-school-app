import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TransportStatus } from '@prisma/client';
import { TransportsRepository, normalizeName, normalizeKey } from '../repository/transports.repository';
import type { SessionActor, CreateTransportInput, UpdateTransportInput } from '@custom-school/contracts';

@Injectable()
export class ManageTransportsService {
  constructor(private readonly repository: TransportsRepository) {}

  async listTransports(schoolId: string) {
    return this.repository.listTransports(schoolId);
  }

  async getTransport(schoolId: string, id: string) {
    const transport = await this.repository.findTransportById(schoolId, id);
    if (!transport) {
      throw new NotFoundException('Transport not found');
    }
    const count = await this.repository.countActiveAssignmentsForTransport(schoolId, id);
    return {
      ...transport,
      activeAssignmentCount: count,
    };
  }

  async createTransport(actor: SessionActor, input: CreateTransportInput) {
    const schoolId = actor.schoolId!;
    const normalizedName = normalizeKey(input.name);
    const transportNumber = input.transportNumber.trim();

    const existingName = await this.repository.findTransportByNormalizedName(schoolId, normalizedName);
    if (existingName) {
      throw new ConflictException(`A transport route with the name "${input.name.trim()}" already exists in this school.`);
    }

    const existingNumber = await this.repository.findTransportByNumber(schoolId, transportNumber);
    if (existingNumber) {
      throw new ConflictException(`A transport route with number "${transportNumber}" already exists in this school.`);
    }

    return this.repository.createTransport(schoolId, input);
  }

  async updateTransport(actor: SessionActor, id: string, input: UpdateTransportInput) {
    const schoolId = actor.schoolId!;
    const existing = await this.repository.findTransportById(schoolId, id);
    if (!existing) {
      throw new NotFoundException('Transport not found');
    }

    if (input.name) {
      const normalizedName = normalizeKey(input.name);
      const duplicateName = await this.repository.findTransportByNormalizedName(schoolId, normalizedName, id);
      if (duplicateName) {
        throw new ConflictException(`A transport route with the name "${input.name.trim()}" already exists in this school.`);
      }
    }

    if (input.transportNumber) {
      const transportNumber = input.transportNumber.trim();
      const duplicateNumber = await this.repository.findTransportByNumber(schoolId, transportNumber, id);
      if (duplicateNumber) {
        throw new ConflictException(`A transport route with number "${transportNumber}" already exists in this school.`);
      }
    }

    return this.repository.updateTransport(schoolId, id, input);
  }

  async updateTransportStatus(actor: SessionActor, id: string, status: TransportStatus) {
    const schoolId = actor.schoolId!;
    const existing = await this.repository.findTransportById(schoolId, id);
    if (!existing) {
      throw new NotFoundException('Transport not found');
    }

    if (status === TransportStatus.INACTIVE) {
      return this.repository.withTransaction(async tx => {
        // Row lock
        const locked = await tx.$queryRaw<any[]>`
          SELECT id FROM transports
          WHERE school_id = ${schoolId} AND id = ${id}::uuid
          FOR UPDATE
        `;
        if (!locked || locked.length === 0) {
          throw new NotFoundException('Transport not found');
        }

        const count = await this.repository.countActiveAssignmentsForTransport(schoolId, id, tx);
        if (count > 0) {
          throw new ConflictException({
            message: `Cannot deactivate transport "${existing.name}": ${count} active student assignment(s) are bound to this transport. Reassign or end assignments first.`,
            activeAssignmentCount: count,
            transportId: id,
          });
        }

        return this.repository.updateTransportStatus(schoolId, id, status, tx);
      });
    }

    return this.repository.updateTransportStatus(schoolId, id, status);
  }
}
