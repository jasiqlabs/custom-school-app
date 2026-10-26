import { Injectable, OnModuleInit } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrivateObjectStorage } from '@custom-school/storage';
import { PrismaService } from '../../database/prisma.service';
import { AppConfig } from '../../config/app-config';
import { ApiError } from '../../common/http/api-error';
import type { FileType } from '@prisma/client';
import { optimizePrivateImage } from './image-optimizer';
// Validated via optimizePrivateImage: MIME and file signature do not match

@Injectable()
export class PrivateFileService implements OnModuleInit {
  readonly storage: PrivateObjectStorage;

  constructor(private readonly prisma: PrismaService, private readonly config: AppConfig) {
    this.storage = new PrivateObjectStorage(process.env);
  }

  async onModuleInit() { await this.storage.initialize(); }

  private async persist(input: {
    schoolId: string;
    fileType: FileType;
    buffer: Buffer;
    mime: string;
    createdBy: string;
  }) {
    const id = randomUUID();
    const objectKey = this.storage.objectKey(input.schoolId, input.fileType, id);
    const sha256 = createHash('sha256').update(input.buffer).digest('hex');
    await this.storage.put(objectKey, input.buffer, input.mime);
    try {
      return await this.prisma.schoolFile.create({
        data: {
          id, schoolId: input.schoolId, fileType: input.fileType, objectKey, mime: input.mime,
          sizeBytes: input.buffer.length, sha256, status: 'AVAILABLE', createdBy: input.createdBy,
        },
      });
    } catch (error) {
      await this.storage.remove(objectKey).catch(() => undefined);
      throw error;
    }
  }

  async storeImage(input: { schoolId: string; fileType: 'LOGO' | 'SIGNATURE' | 'STUDENT_PHOTO'; buffer: Buffer; mime: string; createdBy: string }) {
    const optimized = await optimizePrivateImage(input.buffer, input.mime);
    return this.persist({ ...input, buffer: optimized.buffer, mime: optimized.mime });
  }

  async storeGenerated(input: { schoolId: string; fileType: 'TC' | 'RECEIPT' | 'REPORT_XLSX'; buffer: Buffer; mime: string; createdBy: string }) {
    return this.persist(input);
  }

  async metadata(fileId: string, schoolId: string, fileType?: FileType, tx: any = this.prisma) {
    const file = await tx.schoolFile.findFirst({
      where: { id: fileId, schoolId, status: 'AVAILABLE', ...(fileType ? { fileType } : {}) },
    });
    if (!file) throw new ApiError(404, 'ERR_FILE_NOT_FOUND', 'File not found');
    return file;
  }

  async signedUrl(fileId: string, schoolId: string) {
    const file = await this.metadata(fileId, schoolId);
    return {
      url: await this.storage.signedUrl(file.objectKey, 300),
      expiresInSeconds: 300,
      mime: file.mime,
      sha256: file.sha256,
    };
  }

  async readInternal(fileId: string, schoolId: string) {
    const file = await this.prisma.schoolFile.findFirst({
      where: { id: fileId, schoolId, status: 'AVAILABLE' },
    });
    if (!file) throw new Error('FILE_NOT_FOUND');
    return { file, buffer: await this.storage.read(file.objectKey) };
  }
}
