
import { describe, it, expect, vi } from 'vitest';
import { encrypt, decrypt } from '../encryption';

describe('Encryption Utility', () => {
    const VALID_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 chars

    it('should encrypt and decrypt correctly', () => {
        vi.stubEnv('ENCRYPTION_KEY', VALID_KEY);
        const text = 'Hello DailyPort!';
        const encrypted = encrypt(text);
        expect(encrypted).toContain('v1:');
        expect(encrypted.split(':')).toHaveLength(4);

        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(text);
        vi.unstubAllEnvs();
    });

    it('should fail if tampered with (GCM integrity check)', () => {
        vi.stubEnv('ENCRYPTION_KEY', VALID_KEY);
        const text = 'Secret';
        const encrypted = encrypt(text);
        const parts = encrypted.split(':');
        // Change one bit of the ciphertext
        const tamperedCipher = Buffer.from(parts[2], 'base64');
        tamperedCipher[0] ^= 1;
        const tamperedEncrypted = `${parts[0]}:${parts[1]}:${tamperedCipher.toString('base64')}:${parts[3]}`;

        expect(() => decrypt(tamperedEncrypted)).toThrow();
        vi.unstubAllEnvs();
    });

    it('should throw error if key is invalid length', () => {
        vi.stubEnv('ENCRYPTION_KEY', 'short-key');
        expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
        vi.unstubAllEnvs();
    });

    it('should return as-is if fallback triggered for non-encrypted data', () => {
        vi.stubEnv('ENCRYPTION_KEY', VALID_KEY);
        const rawData = 'Plain data';
        const result = decrypt(rawData);
        expect(result).toBe(rawData);
        vi.unstubAllEnvs();
    });
});
