import { Injectable } from '@nestjs/common';

export interface PutObjectParams {
  bucket: string;
  key: string;
  buffer: Buffer;
  mimeType: string;
}

@Injectable()
export class MinioObjectStorageAdapter {
  private inMemoryObjects = new Map<string, { buffer: Buffer; mimeType: string }>();

  async putObject(params: PutObjectParams): Promise<{ etag: string }> {
    this.inMemoryObjects.set(`${params.bucket}/${params.key}`, {
      buffer: params.buffer,
      mimeType: params.mimeType,
    });
    return { etag: 'mock-etag-' + Date.now() };
  }

  async getObject(bucket: string, key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    return this.inMemoryObjects.get(`${bucket}/${key}`) || null;
  }

  async presignedGetObject(bucket: string, key: string, expiresInSeconds = 300): Promise<string> {
    const fullPath = `${bucket}/${key}`;
    // Presigned download URL format
    return `https://storage.customschool.internal/${fullPath}?token=mock-sig-${Date.now()}&expires=${expiresInSeconds}`;
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    this.inMemoryObjects.delete(`${bucket}/${key}`);
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
