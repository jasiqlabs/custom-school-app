import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  UploadSchoolFileDto,
  SchoolFileRecord,
  FileCategory,
} from '@custom-school/contracts';
import { SchoolFileRepository } from '../repositories/school-file.repository';
import { MinioObjectStorageAdapter } from '../adapters/minio-object-storage.adapter';
import { TenantBoundaryException } from '../errors';

@Injectable()
export class ObjectStorageService {
  private readonly BUCKET_NAME = process.env.MINIO_BUCKET || 'custom-school-storage';

  // File size limits in bytes
  private readonly CATEGORY_SIZE_LIMITS: Record<FileCategory, number> = {
    LOGO: 2 * 1024 * 1024, // 2 MB
    SIGNATURE: 1 * 1024 * 1024, // 1 MB
    RECEIPT: 5 * 1024 * 1024, // 5 MB
    EXPORT: 10 * 1024 * 1024, // 10 MB
    DOCUMENT: 5 * 1024 * 1024, // 5 MB
  };

  constructor(
    private readonly fileRepository: SchoolFileRepository,
    private readonly minioAdapter: MinioObjectStorageAdapter
  ) {}

  async putSchoolFile(dto: UploadSchoolFileDto): Promise<SchoolFileRecord> {
    const maxSizeBytes = this.CATEGORY_SIZE_LIMITS[dto.category] || 5 * 1024 * 1024;
    if (dto.fileSizeBytes > maxSizeBytes) {
      throw new BadRequestException(
        `File size ${dto.fileSizeBytes} exceeds maximum allowed size ${maxSizeBytes} bytes for category ${dto.category}`
      );
    }

    const fileId = crypto.randomUUID();
    const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `tenants/${dto.schoolId}/${dto.category}/${fileId}-${sanitizedFileName}`;

    await this.minioAdapter.putObject({
      bucket: this.BUCKET_NAME,
      key: storageKey,
      buffer: dto.contentBuffer,
      mimeType: dto.mimeType,
    });

    const fileRecord: SchoolFileRecord = {
      id: fileId,
      schoolId: dto.schoolId,
      category: dto.category,
      fileName: dto.fileName,
      fileSizeBytes: dto.fileSizeBytes,
      mimeType: dto.mimeType,
      storageKey,
      uploadedBy: dto.uploadedBy,
      createdAt: new Date(),
      status: 'ACTIVE',
    };

    return this.fileRepository.create(fileRecord);
  }

  async getSignedDownloadUrl(schoolId: string, fileId: string, expiresInSeconds = 300): Promise<string> {
    const file = await this.fileRepository.findById(fileId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Cross-tenant protection: reject if file does not belong to the requesting school
    if (file.schoolId !== schoolId) {
      throw new TenantBoundaryException(
        `Access denied: File ${fileId} does not belong to school ${schoolId}`
      );
    }

    // Clamp TTL to maximum 300 seconds per security contract
    const ttl = Math.min(expiresInSeconds, 300);
    return this.minioAdapter.presignedGetObject(this.BUCKET_NAME, file.storageKey, ttl);
  }
}
