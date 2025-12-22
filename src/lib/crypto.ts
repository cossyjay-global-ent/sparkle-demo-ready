import CryptoJS from 'crypto-js';

const SALT = 'offline-pos-salt-v1';

export function hashPassword(password: string): string {
  return CryptoJS.PBKDF2(password, SALT, {
    keySize: 256 / 32,
    iterations: 10000
  }).toString();
}

export function verifyPassword(password: string, hash: string): boolean {
  const inputHash = hashPassword(password);
  return inputHash === hash;
}

export function encryptData(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

export function decryptData(encryptedData: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}
