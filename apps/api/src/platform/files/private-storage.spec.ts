import { Readable } from 'stream';
import { PrivateObjectStorage } from '@custom-school/storage';

const mockMinio = {
  bucketExists: jest.fn().mockResolvedValue(true),
  makeBucket: jest.fn().mockResolvedValue(undefined),
  putObject: jest.fn().mockResolvedValue(undefined),
  getObject: jest.fn().mockImplementation(async () => Readable.from([Buffer.from('legacy')])),
  presignedGetObject: jest.fn().mockResolvedValue('https://signed.example/minio'),
  removeObject: jest.fn().mockResolvedValue(undefined),
};
const mockFirebaseFile = {
  save: jest.fn().mockResolvedValue(undefined),
  download: jest.fn().mockResolvedValue([Buffer.from('firebase')]),
  getSignedUrl: jest.fn().mockResolvedValue(['https://signed.example/firebase']),
  delete: jest.fn().mockResolvedValue(undefined),
};
const mockFirebaseBucket = {
  getMetadata: jest.fn().mockResolvedValue([{}]),
  file: jest.fn().mockReturnValue(mockFirebaseFile),
};

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => mockMinio),
}));
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue(mockFirebaseBucket),
  })),
}));

describe('private storage provider selection and file lifecycle', () => {
  const minioEnv = {
    MINIO_ENDPOINT: 'localhost', MINIO_PORT: '9000',
    MINIO_ACCESS_KEY: 'test-user', MINIO_SECRET_KEY: 'test-password',
    MINIO_BUCKET: 'private-test',
  };
  const firebaseEnv = {
    STORAGE_PROVIDER: 'firebase',
    FIREBASE_STORAGE_BUCKET: 'demo.firebasestorage.app',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to MinIO, preserving the original object key', async () => {
    const store = new PrivateObjectStorage(minioEnv);
    const key = store.objectKey('school', 'LOGO', 'file');
    expect(store.provider).toBe('minio');
    expect(key).toBe('schools/school/logo/file');
    await store.initialize();
    await store.put(key, Buffer.from('image'), 'image/png');
    expect(mockMinio.putObject).toHaveBeenCalledWith(
      'private-test', key, expect.any(Buffer), 5,
      { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' },
    );
    expect((await store.read(key)).toString()).toBe('legacy');
    expect(await store.signedUrl(key)).toBe('https://signed.example/minio');
  });

  it('stores private Firebase objects and returns signed URLs', async () => {
    const store = new PrivateObjectStorage(firebaseEnv);
    const key = store.objectKey('school', 'TC', 'file');
    expect(key).toBe('firebase/schools/school/tc/file');
    await store.initialize();
    await store.put(key, Buffer.from('pdf'), 'application/pdf');
    expect(mockFirebaseBucket.file).toHaveBeenCalledWith('schools/school/tc/file');
    expect(mockFirebaseFile.save).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        resumable: false,
        validation: 'crc32c',
        metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' },
      }),
    );
    expect((await store.read(key)).toString()).toBe('firebase');
    expect(await store.signedUrl(key)).toBe('https://signed.example/firebase');
    expect(mockFirebaseFile.getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({ version: 'v4', action: 'read' }),
    );
    await store.remove(key);
    expect(mockFirebaseFile.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it('reads historical MinIO branding even when Firebase is the new write provider', async () => {
    const store = new PrivateObjectStorage({ ...minioEnv, ...firebaseEnv });
    expect((await store.read('schools/old/logo/id')).toString()).toBe('legacy');
    expect(await store.signedUrl('schools/old/logo/id')).toBe('https://signed.example/minio');
    expect(mockFirebaseBucket.file).not.toHaveBeenCalled();
  });

  it('reads Firebase-era files after switching back to MinIO', async () => {
    const store = new PrivateObjectStorage({
      ...minioEnv, FIREBASE_STORAGE_BUCKET: firebaseEnv.FIREBASE_STORAGE_BUCKET,
    });
    expect((await store.read('firebase/schools/old/logo/id')).toString()).toBe('firebase');
    expect(mockFirebaseBucket.file).toHaveBeenCalledWith('schools/old/logo/id');
  });

  it('rejects unrecognized providers and missing Firebase bucket', () => {
    expect(() => new PrivateObjectStorage({ ...minioEnv, STORAGE_PROVIDER: 'other' }))
      .toThrow('STORAGE_PROVIDER must be minio or firebase');
    expect(() => new PrivateObjectStorage({ STORAGE_PROVIDER: 'firebase' }))
      .toThrow('FIREBASE_STORAGE_BUCKET');
  });

  it('requires legacy credentials when reading MinIO objects after switching', async () => {
    const store = new PrivateObjectStorage(firebaseEnv);
    await expect(store.read('schools/old/logo/id')).rejects.toThrow('MinIO credentials');
    await expect(store.read('../../other-object')).rejects.toThrow('Unsupported private storage object key');
  });
});
