import { Storage, type Bucket } from '@google-cloud/storage';
import { Client as MinioClient } from 'minio';

export type StorageProvider = 'minio' | 'firebase';

/**
 * Existing keys beginning with schools/ always belong to MinIO.
 * New Firebase keys begin with firebase/schools/. This makes provider
 * switching non-destructive without changing the school_files schema.
 */
export class PrivateObjectStorage {
  readonly provider: StorageProvider;
  private readonly minio?: MinioClient;
  private readonly minioBucket: string;
  private readonly firebaseBucket?: Bucket;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const selected = (env.STORAGE_PROVIDER || 'minio').trim().toLowerCase();
    if (selected !== 'minio' && selected !== 'firebase') {
      throw new Error('STORAGE_PROVIDER must be minio or firebase');
    }
    this.provider = selected;
    this.minioBucket = env.MINIO_BUCKET || 'gdys-private';

    const accessKey = env.MINIO_ACCESS_KEY?.trim();
    const secretKey = env.MINIO_SECRET_KEY?.trim();
    if (this.provider === 'minio' || accessKey || secretKey) {
      if (!accessKey || !secretKey) {
        throw new Error('MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required to access MinIO files');
      }
      const port = Number(env.MINIO_PORT || '9000');
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid MINIO_PORT');
      this.minio = new MinioClient({
        endPoint: env.MINIO_ENDPOINT || 'localhost',
        port,
        useSSL: env.MINIO_USE_SSL === 'true',
        accessKey,
        secretKey,
      });
    }

    const firebaseName = env.FIREBASE_STORAGE_BUCKET?.trim();
    if (this.provider === 'firebase' || firebaseName) {
      if (!firebaseName || firebaseName.startsWith('gs://') || firebaseName.includes('/')) {
        throw new Error('FIREBASE_STORAGE_BUCKET must be a valid bucket name without gs://');
      }
      const json = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
      let storage: Storage;
      if (json) {
        let credentials: { client_email?: string; private_key?: string; project_id?: string };
        try {
          credentials = JSON.parse(json);
        } catch {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
        }
        if (!credentials?.client_email || !credentials?.private_key) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain client_email and private_key');
        }
        storage = new Storage({ credentials });
      } else {
        // Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS or workload identity).
        storage = new Storage();
      }
      this.firebaseBucket = storage.bucket(firebaseName);
    }
  }

  /** Persist the storage choice in the object key, without a DB migration. */
  objectKey(schoolId: string, fileType: string, fileId: string): string {
    const key = `schools/${schoolId}/${fileType.toLowerCase()}/${fileId}`;
    return this.provider === 'firebase' ? `firebase/${key}` : key;
  }

  private resolve(key: string): { provider: StorageProvider; path: string } {
    if (key.startsWith('firebase/schools/')) {
      if (!this.firebaseBucket) {
        throw new Error('Firebase credentials/bucket are required to read existing Firebase files');
      }
      return { provider: 'firebase', path: key.slice('firebase/'.length) };
    }
    if (key.startsWith('schools/')) {
      if (!this.minio) {
        throw new Error('MinIO credentials are required to read existing MinIO files');
      }
      return { provider: 'minio', path: key };
    }
    throw new Error('Unsupported private storage object key');
  }

  async initialize(): Promise<void> {
    if (this.provider === 'minio') {
      const exists = await this.minio!.bucketExists(this.minioBucket);
      if (!exists) {
        try {
          await this.minio!.makeBucket(this.minioBucket);
        } catch (error) {
          if (!(await this.minio!.bucketExists(this.minioBucket))) throw error;
        }
      }
    } else {
      await this.firebaseBucket!.getMetadata();
    }
  }

  async checkReady(): Promise<void> {
    if (this.provider === 'minio') {
      if (!(await this.minio!.bucketExists(this.minioBucket))) throw new Error('STORAGE_BUCKET_NOT_FOUND');
    } else {
      await this.firebaseBucket!.getMetadata();
    }
  }

  async put(key: string, bytes: Buffer, mime: string): Promise<void> {
    const target = this.resolve(key);
    if (target.provider === 'minio') {
      await this.minio!.putObject(this.minioBucket, target.path, bytes, bytes.length, {
        'Content-Type': mime,
        'Cache-Control': 'private, no-store',
      });
    } else {
      await this.firebaseBucket!.file(target.path).save(bytes, {
        resumable: false,
        validation: 'crc32c',
        metadata: { contentType: mime, cacheControl: 'private, no-store' },
      });
    }
  }

  async read(key: string): Promise<Buffer> {
    const target = this.resolve(key);
    if (target.provider === 'firebase') {
      const [bytes] = await this.firebaseBucket!.file(target.path).download();
      return bytes;
    }
    const stream = await this.minio!.getObject(this.minioBucket, target.path);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async signedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const target = this.resolve(key);
    if (target.provider === 'minio') {
      return this.minio!.presignedGetObject(this.minioBucket, target.path, expiresInSeconds);
    }
    const [url] = await this.firebaseBucket!.file(target.path).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
    });
    return url;
  }

  async remove(key: string): Promise<void> {
    const target = this.resolve(key);
    if (target.provider === 'minio') {
      await this.minio!.removeObject(this.minioBucket, target.path);
    } else {
      await this.firebaseBucket!.file(target.path).delete({ ignoreNotFound: true });
    }
  }
}
