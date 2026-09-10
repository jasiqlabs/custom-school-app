import { SensitiveFieldCryptoService } from './sensitive-field-crypto.service';
import { AppConfig } from '../../config/app-config';
import { randomBytes } from 'crypto';

describe('SensitiveFieldCryptoService', () => {
  let service: SensitiveFieldCryptoService;
  const key1 = randomBytes(32).toString('base64');
  const key2 = randomBytes(32).toString('base64');

  beforeEach(() => {
    const config = {
      encryptionKeysJson: JSON.stringify({ v1: key1, v2: key2 }),
      encryptionActiveVersion: 'v1',
    } as AppConfig;
    service = new SensitiveFieldCryptoService(config);
  });

  it('encrypts and decrypts JSON payload with AES-256-GCM', () => {
    const payload = { aadhaar: '1234-5678-9012', medicalNotes: 'Asthma' };
    const aad = { schoolId: 'school-1', aggregateType: 'STUDENT', aggregateId: 'stu-1' };

    const envelope = service.encryptJson(payload, aad);
    expect(envelope.keyVersion).toBe('v1');
    expect(envelope.ciphertext).toBeDefined();
    expect(envelope.iv).toBeDefined();
    expect(envelope.tag).toBeDefined();

    const decrypted = service.decryptJson<typeof payload>(envelope, aad);
    expect(decrypted).toEqual(payload);
  });

  it('fails decryption if AAD is tampered with (e.g. cross-tenant or wrong aggregate)', () => {
    const payload = { pan: 'ABCDE1234F' };
    const aad = { schoolId: 'school-1', aggregateType: 'STUDENT', aggregateId: 'stu-1' };
    const tamperedAad = { schoolId: 'school-2', aggregateType: 'STUDENT', aggregateId: 'stu-1' };

    const envelope = service.encryptJson(payload, aad);
    expect(() => service.decryptJson(envelope, tamperedAad)).toThrow();
  });

  it('supports multiple key versions and fails for unknown version', () => {
    const payload = { secret: 'data' };
    const envelope = service.encryptJson(payload, { schoolId: 's1' });
    const invalidEnvelope = { ...envelope, keyVersion: 'v999' };
    expect(() => service.decryptJson(invalidEnvelope, { schoolId: 's1' })).toThrow('Unknown encryption key version');
  });
});
