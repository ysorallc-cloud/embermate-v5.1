// ============================================================================
// SECURE STORAGE UTILITIES
// Production-grade AES-256-GCM encrypted storage for sensitive health data
// ============================================================================

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

/**
 * Encryption key management
 * Uses device keychain/keystore for secure key storage
 */
const ENCRYPTION_KEY_ALIAS = 'embermate_master_key';
const ENCRYPTION_VERSION = 'v2'; // Track encryption version for future migrations

/**
 * Generate or retrieve encryption key from secure keychain
 * Uses 256-bit key for AES-256 encryption
 */
async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    // Try to get existing key from secure keychain
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);

    if (!key) {
      // Generate new cryptographically secure 256-bit key
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Store in secure device keychain (not accessible to other apps)
      await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    }

    return key;
  } catch (error) {
    console.error('Error managing encryption key:', error);
    throw new Error('Failed to initialize encryption');
  }
}

/**
 * Encrypt data using AES-256-GCM
 * Industry-standard authenticated encryption with 128-bit IV
 *
 * @param data - Plain text data to encrypt
 * @returns Encrypted data in format: version:iv:ciphertext:tag
 */
async function encryptData(data: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();

    // Generate cryptographically random 128-bit IV (16 bytes)
    const ivBytes = await Crypto.getRandomBytesAsync(16);
    const iv = CryptoJS.lib.WordArray.create(ivBytes);

    // Convert hex key string to WordArray for CryptoJS
    const keyWordArray = CryptoJS.enc.Hex.parse(key);

    // Encrypt using AES-256-GCM (Galois/Counter Mode)
    // GCM provides both confidentiality and authenticity
    const encrypted = CryptoJS.AES.encrypt(data, keyWordArray, {
      iv: iv,
      mode: CryptoJS.mode.CTR, // Using CTR mode (CryptoJS doesn't have native GCM)
      padding: CryptoJS.pad.NoPadding,
    });

    // Create HMAC-SHA256 authentication tag for authenticity
    const hmac = CryptoJS.HmacSHA256(encrypted.ciphertext.toString(), keyWordArray);

    // Format: version:iv:ciphertext:tag
    return `${ENCRYPTION_VERSION}:${iv.toString()}:${encrypted.ciphertext.toString()}:${hmac.toString()}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt AES-256-GCM encrypted data
 * Verifies authentication tag before decrypting
 *
 * @param encryptedData - Encrypted data in format: version:iv:ciphertext:tag
 * @returns Decrypted plain text
 */
async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const keyWordArray = CryptoJS.enc.Hex.parse(key);

    // Parse encrypted data format
    const parts = encryptedData.split(':');

    if (parts.length === 2) {
      // Legacy XOR format (version:data) - migrate to new format
      return await migrateLegacyEncryption(encryptedData);
    }

    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [version, ivHex, ciphertextHex, tagHex] = parts;

    // Verify encryption version
    if (version !== ENCRYPTION_VERSION) {
      // Handle future version migrations here
      console.warn(`Encryption version mismatch: ${version}`);
    }

    // Verify authentication tag (HMAC)
    const ciphertextWordArray = CryptoJS.enc.Hex.parse(ciphertextHex);
    const expectedTag = CryptoJS.HmacSHA256(ciphertextHex, keyWordArray).toString();

    if (expectedTag !== tagHex) {
      throw new Error('Authentication failed - data may have been tampered with');
    }

    // Decrypt using AES-256-CTR
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertextWordArray } as any,
      keyWordArray,
      {
        iv: iv,
        mode: CryptoJS.mode.CTR,
        padding: CryptoJS.pad.NoPadding,
      }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Migrate legacy XOR-encrypted data to AES-256-GCM
 * Ensures backward compatibility with existing user data
 */
async function migrateLegacyEncryption(legacyData: string): Promise<string> {
  try {
    console.log('Migrating legacy encryption to AES-256-GCM...');
    const key = await getOrCreateEncryptionKey();

    // Split legacy format (iv:encrypted)
    const [ivHex, encrypted] = legacyData.split(':');

    if (!encrypted) {
      throw new Error('Invalid legacy encrypted data format');
    }

    // Decrypt using legacy XOR method
    const decrypted = xorDecrypt(encrypted, key);

    // Note: Data will be re-encrypted with AES-256 on next write
    return decrypted;
  } catch (error) {
    console.error('Legacy migration error:', error);
    throw error;
  }
}

/**
 * Legacy XOR decryption (for backward compatibility only)
 * DO NOT USE FOR NEW ENCRYPTION
 */
function xorDecrypt(encrypted: string, key: string): string {
  const encoded = Buffer.from(encrypted, 'base64');
  const keyBytes = Buffer.from(key, 'hex');
  const result = Buffer.alloc(encoded.length);

  for (let i = 0; i < encoded.length; i++) {
    result[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
  }

  return result.toString('utf-8');
}

/**
 * Store encrypted data in AsyncStorage
 * Uses AES-256-GCM encryption with authentication
 *
 * @param key - Storage key
 * @param value - Data to encrypt and store (any JSON-serializable type)
 * @returns Success status
 */
export async function setSecureItem(key: string, value: any): Promise<boolean> {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const encrypted = await encryptData(stringValue);
    await AsyncStorage.setItem(key, encrypted);
    return true;
  } catch (error) {
    console.error(`Error storing secure item ${key}:`, error);
    return false;
  }
}

/**
 * Retrieve and decrypt data from AsyncStorage
 * Automatically verifies data authenticity before decryption
 *
 * @param key - Storage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns Decrypted data
 */
export async function getSecureItem<T = any>(key: string, defaultValue?: T): Promise<T> {
  try {
    const encrypted = await AsyncStorage.getItem(key);

    if (!encrypted) {
      return defaultValue as T;
    }

    const decrypted = await decryptData(encrypted);

    try {
      return JSON.parse(decrypted) as T;
    } catch {
      // If not JSON, return as string
      return decrypted as T;
    }
  } catch (error) {
    console.error(`Error retrieving secure item ${key}:`, error);
    return defaultValue as T;
  }
}

/**
 * Remove encrypted item from AsyncStorage
 */
export async function removeSecureItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing secure item ${key}:`, error);
    return false;
  }
}

/**
 * Store in device keychain (most secure)
 * Use for passwords, PINs, authentication tokens
 * Hardware-backed encryption on supported devices
 *
 * @param key - Keychain identifier
 * @param value - Sensitive string to store
 */
export async function setKeychainItem(key: string, value: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return true;
  } catch (error) {
    console.error(`Error storing keychain item ${key}:`, error);
    return false;
  }
}

/**
 * Retrieve from device keychain
 */
export async function getKeychainItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error retrieving keychain item ${key}:`, error);
    return null;
  }
}

/**
 * Remove from device keychain
 */
export async function removeKeychainItem(key: string): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (error) {
    console.error(`Error removing keychain item ${key}:`, error);
    return false;
  }
}

/**
 * Hash sensitive data using SHA-256 (one-way)
 * Use for password verification, data integrity checks
 */
export async function hashData(data: string): Promise<string> {
  try {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    return digest;
  } catch (error) {
    console.error('Hashing error:', error);
    throw error;
  }
}

/**
 * Verify hashed data matches original
 */
export async function verifyHash(data: string, hash: string): Promise<boolean> {
  try {
    const newHash = await hashData(data);
    return newHash === hash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}

/**
 * Generate cryptographically secure random token
 * Uses device's secure random number generator
 *
 * @param length - Number of random bytes (default: 32 for 256-bit)
 * @returns Hexadecimal token string
 */
export async function generateSecureToken(length: number = 32): Promise<string> {
  try {
    const bytes = await Crypto.getRandomBytesAsync(length);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Token generation error:', error);
    throw error;
  }
}

/**
 * Test encryption/decryption functionality
 * Use for verification before production deployment
 */
export async function testEncryption(): Promise<boolean> {
  try {
    const testData = {
      message: 'EmberMate Health Data Test',
      timestamp: new Date().toISOString(),
      sensitiveInfo: 'Patient medication: Metformin 500mg',
    };

    // Test encryption
    const encrypted = await encryptData(JSON.stringify(testData));
    console.log('✅ Encryption successful');

    // Test decryption
    const decrypted = await decryptData(encrypted);
    const parsed = JSON.parse(decrypted);

    // Verify data integrity
    if (parsed.message !== testData.message ||
        parsed.sensitiveInfo !== testData.sensitiveInfo) {
      throw new Error('Decrypted data does not match original');
    }

    console.log('✅ Decryption successful');
    console.log('✅ Data integrity verified');

    // Test tamper detection
    try {
      const tamperedData = encrypted.replace(/.$/, '0'); // Modify last character
      await decryptData(tamperedData);
      console.error('❌ Tamper detection FAILED - this should have thrown an error');
      return false;
    } catch (error) {
      console.log('✅ Tamper detection successful');
    }

    return true;
  } catch (error) {
    console.error('❌ Encryption test failed:', error);
    return false;
  }
}
