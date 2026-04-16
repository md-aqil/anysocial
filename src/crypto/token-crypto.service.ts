import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { DecryptionError } from '../errors/decryption.error.js';

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export class TokenCryptoService {
  private key: Buffer;

  constructor() {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plain: string): EncryptedToken {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    
    let ciphertext = cipher.update(plain, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  decrypt({ ciphertext, iv, authTag }: EncryptedToken): string {
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(authTag, 'base64'));
      
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
    } catch (error) {
      throw new DecryptionError('Failed to decrypt token');
    }
  }
}

export const tokenCrypto = new TokenCryptoService();
