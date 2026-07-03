// ============================================================================
// SECURE STORAGE UTILITIES
// Production-grade AES-256-CTR + HMAC-SHA256 (Encrypt-then-MAC) encrypted storage for sensitive health data
// ============================================================================

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { devLog, logError } from './devLog';

/**
 * Encryption key management
 * Uses device keychain/keystore for secure key storage
 */
const ENCRYPTION_KEY_ALIAS = 'embermate_master_key';
const ENCRYPTION_VERSION = 'v3'; // v3: separate enc/mac keys, constant-time HMAC

/**
 * Constant-time string comparison to prevent timing attacks on HMAC verification.
 * Always compares all characters regardless of where differences occur.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

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
    logError('secureStorage.getOrCreateEncryptionKey', error);
    throw new Error('Failed to initialize encryption');
  }
}

/**
 * Encrypt data using AES-256-CTR with HMAC-SHA256 (Encrypt-then-MAC)
 * Separate keys derived for encryption and authentication.
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

    // Derive separate keys for encryption and authentication
    const masterKey = CryptoJS.enc.Hex.parse(key);
    const encKey = CryptoJS.HmacSHA256('enc', masterKey);
    const macKey = CryptoJS.HmacSHA256('mac', masterKey);

    // Encrypt using AES-256-CTR
    const encrypted = CryptoJS.AES.encrypt(data, encKey, {
      iv: iv,
      mode: CryptoJS.mode.CTR,
      padding: CryptoJS.pad.NoPadding,
    });

    // Create HMAC-SHA256 authentication tag (Encrypt-then-MAC)
    const hmac = CryptoJS.HmacSHA256(encrypted.ciphertext.toString(), macKey);

    // Format: version:iv:ciphertext:tag
    return `${ENCRYPTION_VERSION}:${iv.toString()}:${encrypted.ciphertext.toString()}:${hmac.toString()}`;
  } catch (error) {
    logError('secureStorage.encryptData', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt AES-256-CTR + HMAC-SHA256 encrypted data
 * Verifies authentication tag before decrypting (constant-time comparison)
 *
 * @param encryptedData - Encrypted data in format: version:iv:ciphertext:tag
 * @returns Decrypted plain text
 */
async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const masterKey = CryptoJS.enc.Hex.parse(key);

    // Classify by VERSION PREFIX, not by colon count. Our authenticated
    // ciphertext is "v3:iv:ct:tag" (or legacy "v2:..."), always 4
    // colon-separated parts whose first part is the version tag.
    const parts = encryptedData.split(':');
    const version = parts[0];
    const isOurCiphertext =
      (version === 'v3' || version === 'v2') && parts.length === 4;

    if (!isOurCiphertext) {
      // encrypt-pii fix — anything that is NOT our v3/v2 ciphertext is
      // UN-ENCRYPTED plaintext (e.g. a key newly added to
      // SENSITIVE_KEY_PREFIXES whose value the V3 migration hasn't
      // re-encrypted yet). Pass it through untouched so colon-bearing
      // plaintext JSON (e.g. caregiver_profile's createdAt timestamp)
      // resolves instead of blanking. Previously this split on ':' and
      // either XOR-garbled (2 parts) or threw (>4 parts) → null → blank
      // name. Legacy XOR ("ivHex:base64") is still honored: exactly 2
      // parts AND a hex first segment (plaintext JSON's first segment is
      // never pure hex).
      if (parts.length === 2 && /^[0-9a-fA-F]+$/.test(version)) {
        return await migrateLegacyEncryption(encryptedData);
      }
      return encryptedData;
    }

    const [, ivHex, ciphertextHex, tagHex] = parts;

    // Derive keys based on encryption version
    let encKey: CryptoJS.lib.WordArray;
    let macKey: CryptoJS.lib.WordArray;

    if (version === 'v3') {
      // v3: separate derived keys for encryption and authentication
      encKey = CryptoJS.HmacSHA256('enc', masterKey);
      macKey = CryptoJS.HmacSHA256('mac', masterKey);
    } else {
      // v2 legacy: same master key for both (backward compatible)
      encKey = masterKey;
      macKey = masterKey;
    }

    // Verify authentication tag (constant-time comparison prevents timing attacks)
    const expectedTag = CryptoJS.HmacSHA256(ciphertextHex, macKey).toString();
    if (!constantTimeEqual(expectedTag, tagHex)) {
      throw new Error('Authentication failed - data may have been tampered with');
    }

    // Decrypt using AES-256-CTR
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertextWordArray = CryptoJS.enc.Hex.parse(ciphertextHex);
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertextWordArray } as any,
      encKey,
      {
        iv: iv,
        mode: CryptoJS.mode.CTR,
        padding: CryptoJS.pad.NoPadding,
      }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    // Log as warning, not error — this is expected on fresh installs or format mismatches
    devLog('[secureStorage.decryptData] Decrypt failed:', error instanceof Error ? error.message : error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Migrate legacy XOR-encrypted data to AES-256-CTR + HMAC
 * Ensures backward compatibility with existing user data
 */
async function migrateLegacyEncryption(legacyData: string): Promise<string> {
  try {
    devLog('Migrating legacy encryption to AES-256-CTR+HMAC...');
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
    logError('secureStorage.migrateLegacyEncryption', error);
    throw error;
  }
}

/**
 * Legacy XOR decryption (for backward compatibility only)
 * DO NOT USE FOR NEW ENCRYPTION
 * Uses Uint8Array instead of Buffer (Buffer is not available in React Native)
 */
function xorDecrypt(encrypted: string, key: string): string {
  const encoded = new Uint8Array(
    atob(encrypted).split('').map(c => c.charCodeAt(0))
  );
  const keyBytes = new Uint8Array(
    (key.match(/.{2}/g) || []).map(byte => parseInt(byte, 16))
  );
  const result = new Uint8Array(encoded.length);

  for (let i = 0; i < encoded.length; i++) {
    result[i] = encoded[i] ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(result);
}

/**
 * Store encrypted data in AsyncStorage
 * Uses AES-256-CTR + HMAC-SHA256 encryption with authentication
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
    logError('secureStorage.setSecureItem', error);
    return false;
  }
}

/**
 * Discriminated result of a secure read. This is the SAFE read path: it never
 * collapses "there was ciphertext we could not decrypt" into "there is no data".
 *
 *   { ok: true,  value }                          — decrypted (or legit plaintext)
 *   { ok: false, reason: 'not_found' }            — nothing was stored
 *   { ok: false, reason: 'decrypt_failed', error} — ciphertext EXISTED, decrypt
 *                                                    FAILED (lost/rotated key,
 *                                                    tamper, corruption). DATA
 *                                                    LOSS if swallowed — caller
 *                                                    must surface or recover.
 */
// A flat shape (rather than a strict discriminated union) so callers can read
// `.ok`, `.reason`, and `.value` without first narrowing on `.ok` — the gate
// test asserts `result.ok` then reads `result.reason`/`result.value` directly.
// Runtime invariant still holds: ok:true → value set, reason undefined; ok:false
// → reason set ('not_found' | 'decrypt_failed'), value undefined.
export interface SecureReadResult<T> {
  ok: boolean;
  value?: T;
  reason?: 'not_found' | 'decrypt_failed';
  error?: unknown;
  /**
   * Present ONLY on a "soft" decrypt_failed: the stored value was NOT our
   * recognized ciphertext and was not JSON, so it passed through decryptData
   * unchanged. That case is structurally indistinguishable between (a) genuine
   * corruption and (b) un-migrated bare-string plaintext (the encrypt-pii
   * contract, e.g. a legacy patient name). We report decrypt_failed so the
   * result API never hands back garbage as if verified, but carry the raw
   * string so a choke point that must honor un-migrated plaintext can recover
   * it instead of blanking. A "hard" decrypt_failed (recognized ciphertext that
   * would not decrypt — the real key-rotation/tamper case) has no passthrough.
   */
  passthroughValue?: string;
}

/**
 * Thrown by the choke points (safeGetItem / encryptedGetRaw) when a sensitive
 * read hits decrypt_failed, so a read cannot silently become an empty state and
 * a subsequent write cannot clobber the still-recoverable ciphertext.
 */
export class SecureDecryptError extends Error {
  readonly key: string;
  constructor(key: string, cause?: unknown) {
    super(`Secure decrypt failed for key "${key}" — stored data exists but could not be decrypted`);
    this.name = 'SecureDecryptError';
    this.key = key;
    if (cause !== undefined) (this as any).cause = cause;
  }
}

/**
 * True when a stored value is in one of OUR recognized encrypted formats
 * (authenticated v3/v2 ciphertext, or legacy 2-part hex XOR). A value that is
 * NOT recognized is either legitimate un-migrated plaintext (handled by
 * decryptData's passthrough) or corruption — the read path decides which.
 */
export function isEncryptedFormat(stored: string): boolean {
  const parts = stored.split(':');
  if ((parts[0] === 'v3' || parts[0] === 'v2') && parts.length === 4) return true;
  if (parts.length === 2 && /^[0-9a-fA-F]+$/.test(parts[0])) return true; // legacy XOR
  return false;
}

/**
 * Result-returning secure read. Distinguishes not_found from decrypt_failed and
 * NEVER silently substitutes a default. This is the read the fix routes health/
 * identity data through.
 *
 * NOTE: `defaultValue` is accepted for call-site parity with getSecureItem but
 * is intentionally NOT auto-returned — deciding what to do on failure is the
 * caller's job, which is the entire point of this API.
 */
export async function getSecureItemResult<T = any>(
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultValue?: T,
): Promise<SecureReadResult<T>> {
  let stored: string | null;
  try {
    stored = await AsyncStorage.getItem(key);
  } catch (error) {
    // A storage-layer read failure is NOT "no data" — surface it.
    return { ok: false, reason: 'decrypt_failed', error };
  }

  if (stored === null || stored === undefined) {
    return { ok: false, reason: 'not_found' };
  }

  let plaintext: string;
  try {
    plaintext = await decryptData(stored);
  } catch (error) {
    // Ciphertext existed and could not be decrypted (key rotation / tamper).
    return { ok: false, reason: 'decrypt_failed', error };
  }

  try {
    return { ok: true, value: JSON.parse(plaintext) as T };
  } catch {
    // Plaintext isn't JSON. Either a legit encrypted string value (decrypt
    // verified OUR ciphertext) → return the string; or decryptData passed a
    // stored value through UNCHANGED because it was neither our ciphertext nor
    // parseable → a "soft" decrypt_failed (corruption OR un-migrated bare-string
    // plaintext — indistinguishable). Report failure but carry the raw value.
    if (!isEncryptedFormat(stored) && plaintext === stored) {
      return { ok: false, reason: 'decrypt_failed', passthroughValue: plaintext };
    }
    return { ok: true, value: plaintext as unknown as T };
  }
}

/**
 * Retrieve and decrypt data from AsyncStorage.
 *
 * LEGACY / NON-SENSITIVE ONLY. On a decrypt failure this returns `defaultValue`
 * (it swallows). That is acceptable for non-sensitive keys, but for health /
 * identity data it is DATA LOSS — those callers must use getSecureItemResult
 * (directly, or via safeStorage's safeGetItemResult / the throwing safeGetItem
 * & encryptedGetRaw choke points). Kept as a thin wrapper so existing
 * non-sensitive call sites are undisturbed.
 *
 * @param key - Storage key
 * @param defaultValue - Default value ONLY when the key does not exist
 * @returns Decrypted data, or the default when not found
 * @throws SecureDecryptError when stored ciphertext exists but cannot be decrypted
 */
export async function getSecureItem<T = any>(key: string, defaultValue?: T): Promise<T> {
  // The swallow path is GONE: a decrypt failure is never folded into the
  // default. Implemented on getSecureItemResult so there is exactly one place
  // that classifies a read.
  //   ok            -> value
  //   not_found     -> default (a legit empty state)
  //   soft failure  -> passthroughValue: un-migrated bare-string plaintext
  //                    (encrypt-pii recovery contract) is returned as-is
  //   hard failure  -> recognized ciphertext that will not decrypt (lost/
  //                    rotated key, tamper) -> THROW. Surfacing beats handing
  //                    back a default over recoverable-but-unreadable data.
  const result = await getSecureItemResult<T>(key, defaultValue);
  if (result.ok) return result.value as T;
  if (result.reason === 'not_found') return defaultValue as T;
  if (result.passthroughValue !== undefined) {
    return result.passthroughValue as unknown as T;
  }
  throw new SecureDecryptError(key, result.error);
}

/**
 * Remove encrypted item from AsyncStorage
 */
export async function removeSecureItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    logError('secureStorage.removeSecureItem', error);
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
    logError('secureStorage.setKeychainItem', error);
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
    logError('secureStorage.getKeychainItem', error);
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
    logError('secureStorage.removeKeychainItem', error);
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
    logError('secureStorage.hashData', error);
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
    logError('secureStorage.verifyHash', error);
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
    logError('secureStorage.generateSecureToken', error);
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
    devLog('Encryption successful');

    // Test decryption
    const decrypted = await decryptData(encrypted);
    const parsed = JSON.parse(decrypted);

    // Verify data integrity
    if (parsed.message !== testData.message ||
        parsed.sensitiveInfo !== testData.sensitiveInfo) {
      throw new Error('Decrypted data does not match original');
    }

    devLog('Decryption and integrity verified');

    // Test tamper detection
    try {
      // Flip the last hex char to a guaranteed-different value. Using a
      // constant '0' is non-deterministic: when the original char is already
      // '0' the string is unchanged and tamper detection appears to fail.
      const lastChar = encrypted.slice(-1);
      const tamperedData = encrypted.slice(0, -1) + (lastChar === '0' ? '1' : '0');
      await decryptData(tamperedData);
      logError('secureStorage.testEncryption', 'Tamper detection FAILED - this should have thrown an error');
      return false;
    } catch (error) {
      devLog('Tamper detection successful');
    }

    return true;
  } catch (error) {
    logError('secureStorage.testEncryption', error);
    return false;
  }
}
