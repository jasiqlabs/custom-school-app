import { Injectable } from '@nestjs/common';
import { SchoolFileRecord } from '@custom-school/contracts';

@Injectable()
export class SchoolFileRepository {
  private files = new Map<string, SchoolFileRecord>();

  async create(file: SchoolFileRecord): Promise<SchoolFileRecord> {
    this.files.set(file.id, { ...file });
    return { ...file };
  }

  async findById(id: string): Promise<SchoolFileRecord | null> {
    const file = this.files.get(id);
    return file && file.status === 'ACTIVE' ? { ...file } : null;
  }

  async findBySchoolId(schoolId: string): Promise<SchoolFileRecord[]> {
    return Array.from(this.files.values())
      .filter((f) => f.schoolId === schoolId && f.status === 'ACTIVE')
      .map((f) => ({ ...f }));
  }

  async softDelete(id: string): Promise<SchoolFileRecord | null> {
    const file = this.files.get(id);
    if (!file) return null;
    file.status = 'DELETED';
    return { ...file };
  }
}
