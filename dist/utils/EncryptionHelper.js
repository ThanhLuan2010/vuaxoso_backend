"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionHelper = void 0;
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ALGORITHM = 'aes-256-cbc';
// Ensure a 32-byte key is used. If ENCRYPTION_KEY is not set or invalid, generate one.
let keyString = process.env.ENCRYPTION_KEY;
if (!keyString || keyString.length !== 64) {
    // 64 hex chars = 32 bytes
    keyString = crypto_1.default.randomBytes(32).toString('hex');
    console.warn('WARNING: ENCRYPTION_KEY is not set correctly in .env. Using a random key for this session. Data will not be recoverable after restart!');
}
const KEY = Buffer.from(keyString, 'hex');
class EncryptionHelper {
    static encrypt(text) {
        if (!text)
            return text;
        if (text.startsWith('enc:'))
            return text; // already encrypted
        try {
            const iv = crypto_1.default.randomBytes(16);
            const cipher = crypto_1.default.createCipheriv(ALGORITHM, KEY, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return `enc:${iv.toString('hex')}:${encrypted}`;
        }
        catch (e) {
            console.error('Encryption error:', e);
            return text;
        }
    }
    static decrypt(text) {
        if (!text || !text.startsWith('enc:'))
            return text;
        try {
            const parts = text.split(':');
            if (parts.length !== 3)
                return text;
            const iv = Buffer.from(parts[1], 'hex');
            const encryptedText = Buffer.from(parts[2], 'hex');
            const decipher = crypto_1.default.createDecipheriv(ALGORITHM, KEY, iv);
            let decrypted = decipher.update(encryptedText, undefined, 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (e) {
            console.error('Decryption error:', e);
            return text; // Return original if error
        }
    }
    // Deterministic encryption for searchable fields like phone
    static encryptDeterministic(text) {
        if (!text)
            return text;
        if (text.startsWith('det:'))
            return text; // already encrypted
        try {
            const iv = Buffer.alloc(16, 0); // Fixed IV
            const cipher = crypto_1.default.createCipheriv(ALGORITHM, KEY, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return `det:${encrypted}`;
        }
        catch (e) {
            return text;
        }
    }
    static decryptDeterministic(text) {
        if (!text || !text.startsWith('det:'))
            return text;
        try {
            const encryptedText = Buffer.from(text.substring(4), 'hex');
            const iv = Buffer.alloc(16, 0);
            const decipher = crypto_1.default.createDecipheriv(ALGORITHM, KEY, iv);
            let decrypted = decipher.update(encryptedText, undefined, 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (e) {
            return text;
        }
    }
}
exports.EncryptionHelper = EncryptionHelper;
