import { PrivateObjectStorage } from '@custom-school/storage';

describe('storage provider selection and persistence keys', () => {
  const base = {
    MINIO_ENDPOINT: 'localhost', MINIO_PORT: '9000',
    MINIO_ACCESS_KEY: 'test-user', MINIO_SECRET_KEY: 'test-password',
    MINIO_BUCKET: 'private-test',
  };

  it('preserves MinIO as the default and the old key format', () => {
    const store = new PrivateObjectStorage(base);
    expect(store.provider).toBe('minio');
    expect(store.objectKey('school', 'LOGO', 'file')).toBe('schools/school/logo/file');
  });

  it('uses Firebase-prefixed keys for new files', () => {
    const store = new PrivateObjectStorage({
      STORAGE_PROVIDER: 'firebase', FIREBASE_STORAGE_BUCKET: 'demo.firebasestorage.app',
    });
    expect(store.provider).toBe('firebase');
    expect(store.objectKey('school', 'TC', 'file')).toBe('firebase/schools/school/tc/file');
  });

  it('fails closed on an unknown provider', () => {
    expect(() => new PrivateObjectStorage({ ...base, STORAGE_PROVIDER: 'other' }))
      .toThrow('STORAGE_PROVIDER must be minio or firebase');
  });

  it('requires Firebase bucket when Firebase is selected', () => {
    expect(() => new PrivateObjectStorage({ STORAGE_PROVIDER: 'firebase' }))
      .toThrow('FIREBASE_STORAGE_BUCKET');
  });

  it('keeps legacy MinIO access explicit after switching to Firebase', async () => {
    const store = new PrivateObjectStorage({
      STORAGE_PROVIDER: 'firebase', FIREBASE_STORAGE_BUCKET: 'demo.firebasestorage.app',
    });
    await expect(store.read('schools/old/logo/id')).rejects.toThrow('MinIO credentials');
  });

  it('does not route unknown object keys to any bucket', async () => {
    const store = new PrivateObjectStorage(base);
    await expect(store.read('../../other-object')).rejects.toThrow('Unsupported private storage object key');
  });
});
