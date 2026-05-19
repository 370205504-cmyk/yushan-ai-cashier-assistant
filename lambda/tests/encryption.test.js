const { encrypt, decrypt, encryptPhone, decryptPhone, maskPhone } = require('../utils/encryption');

describe('Encryption Utilities', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const original = 'test123';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should handle empty string', () => {
      expect(encrypt('')).toBe('');
      expect(decrypt('')).toBe('');
    });

    it('should handle null', () => {
      expect(encrypt(null)).toBe('');
      expect(decrypt(null)).toBe('');
    });

    it('should produce different encrypted values for same input', () => {
      const original = 'test';
      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('encryptPhone/decryptPhone', () => {
    it('should encrypt and decrypt phone number correctly', () => {
      const phone = '13812345678';
      const encrypted = encryptPhone(phone);
      const decrypted = decryptPhone(encrypted);
      expect(decrypted).toBe(phone);
    });

    it('should mask phone number correctly', () => {
      const phone = '13812345678';
      const encrypted = encryptPhone(phone);
      const masked = maskPhone(encrypted);
      expect(masked).toBe('138****5678');
    });

    it('should mask plain phone number', () => {
      const phone = '13812345678';
      const masked = maskPhone(phone);
      expect(masked).toBe('****');
    });

    it('should handle invalid phone number', () => {
      const encrypted = encrypt('invalid');
      const masked = maskPhone(encrypted);
      expect(masked).toBe('****');
    });
  });
});
