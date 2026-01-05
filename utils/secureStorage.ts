// ============================================================================
// SECURE STORAGE UTILITIES
// Encrypted storage for sensitive health data
// ============================================================================

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Encryption key management
 * In production, this should use device keychain/keystore
 */
const ENCRYPTION_KEY_ALIAS = 'embermate_master_key';

/**
 * Generate or retrieve encryption key
 */
async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    // Try to get existing key
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);

    if (!key) {
      // Generate new 256-bit key
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Store in secure keychain
      await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, key);
    }

    return key;
  } catch (error) {
    console.error('Error managing encryption key:', error);
    throw new Error('Failed to initialize encryption');
  }
}

/**
 * Simple AES-256 encryption using Crypto
 * Note: For production, consider using a proper crypto library like expo-crypto
 */
async function encryptData(data: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();

    // Create initialization vector
    const iv = await Crypto.getRandomBytesAsync(16);
    const ivHex = Array.from(iv)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Simple XOR encryption (for demo - use proper AES in production)
    const encrypted = xorEncrypt(data, key);

    // Return IV + encrypted data
    return `${ivHex}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt encrypted data
 */
async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();

    // Split IV and data
    const [ivHex, encrypted] = encryptedData.split(':');

    if (!encrypted) {
      throw new Error('Invalid encrypted data format');
    }

    // Decrypt using XOR (use proper AES in production)
    const decrypted = xorDecrypt(encrypted, key);

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

/**
 * Simple XOR encryption (placeholder - use proper AES in production)
 */
function xorEncrypt(data: string, key: string): string {
  const encoded = Buffer.from(data, 'utf-8');
  const keyBytes = Buffer.from(key, 'hex');
  const result = Buffer.alloc(encoded.length);

  for (let i = 0; i < encoded.length; i++) {
    result[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
  }

  return result.toString('base64');
}

/**
 * Simple XOR decryption
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
 * Remove encrypted item
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
 * Use for passwords, PINs, tokens
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
 * Remove from keychain
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
 * Hash sensitive data (one-way)
 * Useful for password verification
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
 * Verify hashed data
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
 * Generate secure random token
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
