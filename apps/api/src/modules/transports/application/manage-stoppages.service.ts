import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TransportStatus } from '@prisma/client';
import { TransportsRepository, normalizeName, normalizeKey } from '../repository/transports.repository';
import type { SessionActor, CreateTransportStoppageInput, UpdateTransportStoppageInput, ReorderStoppagesInput } from '@custom-school/contracts';

@Injectable()
export class ManageStoppagesService {
  constructor(private readonly repository: TransportsRepository) {}

  async listStoppages(schoolId: string, transportId: string) {
    const transport = await this.repository.findTransportById(schoolId, transportId);
    if (!transport) {
      throw new NotFoundException('Transport not found');
    }
    return this.repository.listStoppages(schoolId, transportId);
  }

  async createStoppage(actor: SessionActor, transportId: string, input: CreateTransportStoppageInput) {
    const schoolId = actor.schoolId!;
    const transport = await this.repository.findTransportById(schoolId, transportId);
    if (!transport) {
      throw new NotFoundException('Transport not found');
    }

    const normalizedName = normalizeKey(input.name);
    const existing = await this.repository.findStoppageByName(schoolId, transportId, normalizedName);
    if (existing) {
      throw new ConflictException(`A stoppage named "${input.name.trim()}" already exists on transport "${transport.name}".`);
    }

    return this.repository.createStoppage(schoolId, transportId, input);
  }

  async updateStoppage(actor: SessionActor, id: string, input: UpdateTransportStoppageInput) {
    const schoolId = actor.schoolId!;
    const existing = await this.repository.findStoppageById(schoolId, id);
    if (!existing) {
      throw new NotFoundException('Stoppage not found');
    }

    if (input.name) {
      const normalizedName = normalizeKey(input.name);
      const duplicate = await this.repository.findStoppageByName(schoolId, existing.transportId, normalizedName, id);
      if (duplicate) {
        throw new ConflictException(`A stoppage named "${input.name.trim()}" already exists on this transport.`);
      }
    }

    return this.repository.updateStoppage(schoolId, id, input);
  }

  async updateStoppageStatus(actor: SessionActor, id: string, status: TransportStatus) {
    const schoolId = actor.schoolId!;
    const existing = await this.repository.findStoppageById(schoolId, id);
    if (!existing) {
      throw new NotFoundException('Stoppage not found');
    }

    if (status === TransportStatus.INACTIVE) {
      return this.repository.withTransaction(async tx => {
        // Row lock stoppage
        const locked = await tx.$queryRaw<any[]>`
          SELECT id FROM transport_stoppages
          WHERE school_id = ${schoolId} AND id = ${id}::uuid
          FOR UPDATE
        `;
        if (!locked || locked.length === 0) {
          throw new NotFoundException('Stoppage not found');
        }

        const count = await this.repository.countActiveAssignmentsForStoppage(schoolId, id, tx);
        if (count > 0) {
          throw new ConflictException({
            message: `Cannot deactivate stoppage "${existing.name}": ${count} active student assignment(s) are bound to this stoppage. Reassign or end assignments first.`,
            activeAssignmentCount: count,
            stoppageId: id,
          });
        }

        return this.repository.updateStoppageStatus(schoolId, id, status, tx);
      });
    }

    return this.repository.updateStoppageStatus(schoolId, id, status);
  }

  async reorderStoppages(actor: SessionActor, transportId: string, input: ReorderStoppagesInput) {
    const schoolId = actor.schoolId!;
    const transport = await this.repository.findTransportById(schoolId, transportId);
    if (!transport) {
      throw new NotFoundException('Transport not found');
    }

    return this.repository.reorderStoppages(schoolId, transportId, input.stoppageIds);
  }
}
