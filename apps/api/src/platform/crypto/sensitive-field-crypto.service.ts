import { Injectable } from '@nestjs/common';
import { createCipheriv,createDecipheriv,randomBytes } from 'crypto';
import { AppConfig } from '../../config/app-config';

export interface EncryptedEnvelope {ciphertext:string;iv:string;tag:string;keyVersion:string;}
@Injectable()
export class SensitiveFieldCryptoService {
  private readonly keys=new Map<string,Buffer>();
  constructor(private readonly config:AppConfig){const parsed=JSON.parse(config.encryptionKeysJson) as Record<string,string>; for(const [version,b64] of Object.entries(parsed)){const key=Buffer.from(b64,'base64');if(key.length!==32)throw new Error(`Encryption key ${version} must decode to 32 bytes`);this.keys.set(version,key);} if(!this.keys.has(config.encryptionActiveVersion))throw new Error('Active encryption key version is missing');}
  encryptJson(value:unknown,aad:Record<string,string>):EncryptedEnvelope{const keyVersion=this.config.encryptionActiveVersion;const key=this.keys.get(keyVersion)!;const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(JSON.stringify(aad)));const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return{ciphertext:ciphertext.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),keyVersion};}
  decryptJson<T>(envelope:EncryptedEnvelope,aad:Record<string,string>):T{const key=this.keys.get(envelope.keyVersion);if(!key)throw new Error('Unknown encryption key version');const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));decipher.setAAD(Buffer.from(JSON.stringify(aad)));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));const clear=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]);return JSON.parse(clear.toString('utf8')) as T;}
}
