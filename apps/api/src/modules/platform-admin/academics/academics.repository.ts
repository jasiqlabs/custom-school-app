import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface ClassEntity {
  id: string;
  schoolId: string;
  name: string;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface SectionEntity {
  id: string;
  schoolId: string;
  classId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AcademicsRepository {
  private classes = new Map<string, ClassEntity>();
  private sections = new Map<string, SectionEntity>();
  private activeEnrollmentCounts = new Map<string, number>();

  // Helper for tests to simulate active student enrollments
  setActiveEnrollmentCount(id: string, count: number) {
    this.activeEnrollmentCounts.set(id, count);
  }

  getActiveEnrollmentCount(id: string): number {
    return this.activeEnrollmentCounts.get(id) || 0;
  }

  // --- Classes ---
  async createClass(data: {
    schoolId: string;
    name: string;
    displayOrder?: number;
  }): Promise<ClassEntity> {
    const id = crypto.randomUUID();
    const now = new Date();
    const entity: ClassEntity = {
      id,
      schoolId: data.schoolId,
      name: data.name.trim(),
      displayOrder: data.displayOrder ?? 0,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    this.classes.set(id, entity);
    return { ...entity };
  }

  async findClassById(id: string): Promise<ClassEntity | null> {
    const found = this.classes.get(id);
    return found ? { ...found } : null;
  }

  async findClassBySchoolAndName(schoolId: string, name: string): Promise<ClassEntity | null> {
    const normalized = name.trim().toLowerCase();
    for (const c of this.classes.values()) {
      if (c.schoolId === schoolId && c.name.trim().toLowerCase() === normalized) {
        return { ...c };
      }
    }
    return null;
  }

  async findClassesBySchool(schoolId: string): Promise<ClassEntity[]> {
    return Array.from(this.classes.values())
      .filter((c) => c.schoolId === schoolId)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
      .map((c) => ({ ...c }));
  }

  async updateClass(id: string, updates: Partial<Omit<ClassEntity, 'id' | 'schoolId' | 'createdAt'>>): Promise<ClassEntity | null> {
    const existing = this.classes.get(id);
    if (!existing) return null;
    const updated: ClassEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.classes.set(id, updated);
    return { ...updated };
  }

  async deleteClass(id: string): Promise<boolean> {
    return this.classes.delete(id);
  }

  // --- Sections ---
  async createSection(data: {
    schoolId: string;
    classId: string;
    name: string;
  }): Promise<SectionEntity> {
    const id = crypto.randomUUID();
    const now = new Date();
    const entity: SectionEntity = {
      id,
      schoolId: data.schoolId,
      classId: data.classId,
      name: data.name.trim(),
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    this.sections.set(id, entity);
    return { ...entity };
  }

  async findSectionById(id: string): Promise<SectionEntity | null> {
    const found = this.sections.get(id);
    return found ? { ...found } : null;
  }

  async findSectionByClassAndName(schoolId: string, classId: string, name: string): Promise<SectionEntity | null> {
    const normalized = name.trim().toLowerCase();
    for (const s of this.sections.values()) {
      if (s.schoolId === schoolId && s.classId === classId && s.name.trim().toLowerCase() === normalized) {
        return { ...s };
      }
    }
    return null;
  }

  async findSectionsByClass(classId: string): Promise<SectionEntity[]> {
    return Array.from(this.sections.values())
      .filter((s) => s.classId === classId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ ...s }));
  }

  async findSectionsBySchool(schoolId: string): Promise<SectionEntity[]> {
    return Array.from(this.sections.values())
      .filter((s) => s.schoolId === schoolId)
      .map((s) => ({ ...s }));
  }

  async updateSection(id: string, updates: Partial<Omit<SectionEntity, 'id' | 'schoolId' | 'classId' | 'createdAt'>>): Promise<SectionEntity | null> {
    const existing = this.sections.get(id);
    if (!existing) return null;
    const updated: SectionEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.sections.set(id, updated);
    return { ...updated };
  }

  async deleteSection(id: string): Promise<boolean> {
    return this.sections.delete(id);
  }
}
