import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const ALGORITHM = 'aes-256-cbc';
// Ensure a 32-byte key is used. If ENCRYPTION_KEY is not set or invalid, generate one.
let keyString = process.env.ENCRYPTION_KEY;
if (!keyString || keyString.length !== 64) {
  // 64 hex chars = 32 bytes
  keyString = crypto.randomBytes(32).toString('hex');
  console.warn('WARNING: ENCRYPTION_KEY is not set correctly in .env. Using a random key for this session. Data will not be recoverable after restart!');
}
const KEY = Buffer.from(keyString, 'hex');

export class EncryptionHelper {
  static encrypt(text: string | null | undefined): string | null | undefined {
    if (!text) return text;
    if (text.startsWith('enc:')) return text; // already encrypted
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `enc:${iv.toString('hex')}:${encrypted}`;
    } catch (e) {
      console.error('Encryption error:', e);
      return text;
    }
  }

  static decrypt(text: string | null | undefined): string | null | undefined {
    if (!text || !text.startsWith('enc:')) return text;
    try {
      const parts = text.split(':');
      if (parts.length !== 3) return text;
      const iv = Buffer.from(parts[1], 'hex');
      const encryptedText = Buffer.from(parts[2], 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
      let decrypted = decipher.update(encryptedText, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      console.error('Decryption error:', e);
      return text; // Return original if error
    }
  }

  // Deterministic encryption for searchable fields like phone
  static encryptDeterministic(text: string | null | undefined): string | null | undefined {
    if (!text) return text;
    if (text.startsWith('det:')) return text; // already encrypted
    try {
      const iv = Buffer.alloc(16, 0); // Fixed IV
      const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `det:${encrypted}`;
    } catch (e) {
      return text;
    }
  }

  static decryptDeterministic(text: string | null | undefined): string | null | undefined {
    if (!text || !text.startsWith('det:')) return text;
    try {
      const encryptedText = Buffer.from(text.substring(4), 'hex');
      const iv = Buffer.alloc(16, 0);
      const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
      let decrypted = decipher.update(encryptedText, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      return text;
    }
  }
}
