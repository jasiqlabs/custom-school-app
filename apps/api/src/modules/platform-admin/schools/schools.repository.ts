import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface SchoolEntity {
  id: string;
  schoolUuid: string;
  name: string;
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoFileId?: string | null;
  principalName?: string | null;
  principalContactNumber?: string | null;
  principalSignatureFileId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FindSchoolsFilter {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SchoolsRepository {
  private schools = new Map<string, SchoolEntity>();

  constructor() {
    // Seed an initial demo active school for immediate testing
    const defaultSchool: SchoolEntity = {
      id: '00000000-0000-0000-0000-000000000101',
      schoolUuid: '00000000-0000-0000-0000-000000000101',
      name: 'Springdale Public School',
      code: 'SPS-01',
      status: 'ACTIVE',
      address: '123 Academic Avenue, North Zone',
      contactEmail: 'contact@springdale.edu',
      contactPhone: '9876543210',
      principalName: 'Dr. Arthur Pendelton',
      principalContactNumber: '9876543210',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    this.schools.set(defaultSchool.id, defaultSchool);
  }

  async create(data: {
    name: string;
    code?: string;
    address?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  }): Promise<SchoolEntity> {
    const id = crypto.randomUUID();
    const schoolUuid = crypto.randomUUID();
    const now = new Date();
    const code = data.code || `SCH-${Math.floor(1000 + Math.random() * 9000)}`;

    const entity: SchoolEntity = {
      id,
      schoolUuid,
      name: data.name.trim(),
      code,
      status: 'DRAFT', // Newly created schools always start in DRAFT
      address: data.address?.trim() || null,
      contactEmail: data.contactEmail?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
      logoFileId: null,
      principalName: null,
      principalContactNumber: null,
      principalSignatureFileId: null,
      createdAt: now,
      updatedAt: now,
    };

    this.schools.set(id, entity);
    return { ...entity };
  }

  async update(id: string, updates: Partial<Omit<SchoolEntity, 'id' | 'schoolUuid' | 'createdAt'>>): Promise<SchoolEntity | null> {
    const existing = this.schools.get(id);
    if (!existing) return null;

    // Enforce school_uuid immutability
    const updated: SchoolEntity = {
      ...existing,
      ...updates,
      schoolUuid: existing.schoolUuid, // Immutable
      updatedAt: new Date(),
    };

    this.schools.set(id, updated);
    return { ...updated };
  }

  async findById(id: string): Promise<SchoolEntity | null> {
    const school = this.schools.get(id);
    return school ? { ...school } : null;
  }

  async findBySchoolUuid(schoolUuid: string): Promise<SchoolEntity | null> {
    for (const school of this.schools.values()) {
      if (school.schoolUuid === schoolUuid) {
        return { ...school };
      }
    }
    return null;
  }

  async findByNameNormalized(name: string): Promise<SchoolEntity | null> {
    const normalized = name.trim().toLowerCase();
    for (const school of this.schools.values()) {
      if (school.name.trim().toLowerCase() === normalized) {
        return { ...school };
      }
    }
    return null;
  }

  async findSimilarSchools(name: string): Promise<SchoolEntity[]> {
    const normalized = name.trim().toLowerCase();
    const matches: SchoolEntity[] = [];
    for (const school of this.schools.values()) {
      const schoolNameNorm = school.name.trim().toLowerCase();
      if (schoolNameNorm === normalized || schoolNameNorm.includes(normalized) || normalized.includes(schoolNameNorm)) {
        matches.push({ ...school });
      }
    }
    return matches;
  }

  async findAll(filter: FindSchoolsFilter): Promise<{
    items: SchoolEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 25));
    let result = Array.from(this.schools.values());

    if (filter.status && filter.status.trim() !== '') {
      result = result.filter((s) => s.status === filter.status);
    }

    if (filter.search && filter.search.trim() !== '') {
      const q = filter.search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.schoolUuid.toLowerCase().startsWith(q),
      );
    }

    // Sort descending by creation date
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = result.length;
    const startIndex = (page - 1) * limit;
    const items = result.slice(startIndex, startIndex + limit).map((s) => ({ ...s }));

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
