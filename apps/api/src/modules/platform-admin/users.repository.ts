import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface UserEntity {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: 'PLATFORM_ADMIN' | 'SCHOOL_OPERATOR';
  schoolId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersRepository {
  private users = new Map<string, UserEntity>();

  constructor() {
    // Seed default Platform Admin
    const defaultAdmin: UserEntity = {
      id: '00000000-0000-0000-0000-000000000001',
      fullName: 'System Platform Admin',
      email: 'admin@customschool.com',
      passwordHash: this.hashPassword('Admin@12345'),
      role: 'PLATFORM_ADMIN',
      schoolId: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(defaultAdmin.id, defaultAdmin);
  }

  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(`salt_${password}`).digest('hex');
  }

  verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async create(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    const id = crypto.randomUUID();
    const now = new Date();
    const created: UserEntity = {
      ...user,
      id,
      email: user.email.trim().toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, created);
    return { ...created };
  }

  async update(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated: UserEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return { ...updated };
  }

  async findBySchoolId(schoolId: string): Promise<UserEntity[]> {
    const list: UserEntity[] = [];
    for (const user of this.users.values()) {
      if (user.schoolId === schoolId) {
        list.push({ ...user });
      }
    }
    return list;
  }

  async countBySchoolId(schoolId: string): Promise<number> {
    let count = 0;
    for (const user of this.users.values()) {
      if (user.schoolId === schoolId) {
        count++;
      }
    }
    return count;
  }
}
