// ============================================================================
// SAFE STORAGE UTILITIES
// Prevents JSON parse corruption and provides recovery mechanisms
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSecureItem, getSecureItem } from './secureStorage';
import { devLog, logError } from './devLog';

// ============================================================================
// SENSITIVE KEY ROUTING
// Keys matching these prefixes are transparently encrypted at rest via secureStorage.
// ============================================================================

export const SENSITIVE_KEY_PREFIXES = [
  '@embermate_medical_info',
  '@embermate_emergency_contacts',
  '@embermate_central_vitals_logs',
  '@embermate_central_med_logs',
  '@embermate_central_mood_logs',
  '@embermate_central_symptom_logs',
  '@embermate_central_sleep_logs',
  '@embermate_medication',          // catches @embermate_medications, @embermate_medication_logs, etc.
  '@embermate_wellness_morning',
  '@embermate_wellness_evening',
  '@embermate_patient_registry',
  '@embermate_vitals',               // catches @embermate_vitals_*
  '@embermate_symptoms',
];

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
}

/**
 * Safely parse JSON with fallback to default value
 * Prevents corruption from breaking the app
 */
export function safeJSONParse<T>(
  jsonString: string | null,
  defaultValue: T,
  key?: string
): T {
  if (!jsonString) {
    return defaultValue;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return parsed as T;
  } catch (error) {
    logError('safeStorage.safeJSONParse', error, { key: key || 'unknown' });
    console.warn(`[SafeStorage] Corrupted data detected. Using default value.`);

    // Log the corrupted data for debugging (first 100 chars)
    logError('safeStorage.safeJSONParse', `Corrupted data sample: ${jsonString.substring(0, 100)}...`);

    return defaultValue;
  }
}

/**
 * Safely stringify JSON with error handling
 */
export function safeJSONStringify(data: any, key?: string): string | null {
  try {
    return JSON.stringify(data);
  } catch (error) {
    logError('safeStorage.safeJSONStringify', error, { key: key || 'unknown' });
    return null;
  }
}

/**
 * Safe get with automatic JSON parsing and corruption recovery.
 * Sensitive keys are transparently decrypted via secureStorage.
 */
export async function safeGetItem<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    if (isSensitiveKey(key)) {
      return await getSecureItem<T>(key, defaultValue);
    }
    const data = await AsyncStorage.getItem(key);
    return safeJSONParse(data, defaultValue, key);
  } catch (error) {
    logError('safeStorage.safeGetItem', error, { key });
    return defaultValue;
  }
}

/**
 * Safe set with automatic JSON stringification.
 * Sensitive keys are transparently encrypted via secureStorage.
 * Backup-on-write removed to reduce I/O overhead (was tripling AsyncStorage operations).
 * Backups are handled by the cloudBackup system on explicit user action.
 */
export async function safeSetItem<T>(
  key: string,
  value: T
): Promise<boolean> {
  try {
    if (isSensitiveKey(key)) {
      return await setSecureItem(key, value);
    }

    // Stringify the data
    const jsonString = safeJSONStringify(value, key);

    if (jsonString === null) {
      logError('safeStorage.safeSetItem', `Failed to stringify data for key: ${key}`);
      return false;
    }

    // Save the new value
    await AsyncStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    logError('safeStorage.safeSetItem', error, { key });
    return false;
  }
}

/**
 * Attempt to recover from backup if main data is corrupted
 */
export async function recoverFromBackup<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    devLog(`[SafeStorage] Attempting to recover from backup for key: ${key}`);

    const backupData = await AsyncStorage.getItem(`${key}_backup`);
    if (!backupData) {
      if (__DEV__) console.warn(`[SafeStorage] No backup found for key: ${key}`);
      return defaultValue;
    }

    const recovered = safeJSONParse(backupData, defaultValue, `${key}_backup`);

    // If recovery successful, restore it as the main value
    if (recovered !== defaultValue) {
      await AsyncStorage.setItem(key, backupData);
      devLog(`[SafeStorage] Successfully recovered from backup for key: ${key}`);
    }

    return recovered;
  } catch (error) {
    logError('safeStorage.recoverFromBackup', error, { key });
    return defaultValue;
  }
}

/**
 * Validate that stored data matches expected structure
 * Returns true if valid, false if corrupted
 */
export function validateStructure<T extends object>(
  data: any,
  requiredKeys: (keyof T)[]
): data is T {
  if (!data || typeof data !== 'object') {
    return false;
  }

  for (const key of requiredKeys) {
    if (!(key in data)) {
      if (__DEV__) console.warn(`[SafeStorage] Missing required key: ${String(key)}`);
      return false;
    }
  }

  return true;
}

/**
 * Get item with structure validation and auto-recovery
 */
export async function safeGetItemWithValidation<T extends object>(
  key: string,
  defaultValue: T,
  requiredKeys: (keyof T)[]
): Promise<T> {
  const data = await safeGetItem<T>(key, defaultValue);

  if (validateStructure(data, requiredKeys)) {
    return data;
  }

  if (__DEV__) console.warn(`[SafeStorage] Data structure validation failed for key: ${key}`);

  // Try to recover from backup
  const recovered = await recoverFromBackup(key, defaultValue);

  if (validateStructure(recovered, requiredKeys)) {
    devLog(`[SafeStorage] Validation passed after recovery for key: ${key}`);
    return recovered;
  }

  logError('safeStorage.safeGetItemWithValidation', `Could not recover valid data for key: ${key}. Using default.`);
  return defaultValue;
}

/**
 * Clear corrupted data and backups
 */
export async function clearCorruptedData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    await AsyncStorage.removeItem(`${key}_backup`);
    devLog(`[SafeStorage] Cleared corrupted data for key: ${key}`);
  } catch (error) {
    logError('safeStorage.clearCorruptedData', error, { key });
  }
}

// ============================================================================
// RAW ENCRYPTED GET/SET
// For callers (e.g. centralStorage) that work with raw JSON strings
// instead of pre-parsed objects.
// ============================================================================

/**
 * Read a raw string value, decrypting transparently if the key is sensitive.
 */
export async function encryptedGetRaw(key: string): Promise<string | null> {
  if (isSensitiveKey(key)) {
    return getSecureItem<string>(key, null as any);
  }
  return AsyncStorage.getItem(key);
}

/**
 * Write a raw string value, encrypting transparently if the key is sensitive.
 */
export async function encryptedSetRaw(key: string, value: string): Promise<void> {
  if (isSensitiveKey(key)) {
    await setSecureItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

/**
 * Diagnostic tool - check all storage keys for corruption
 */
export async function diagnosePotentialCorruption(): Promise<{
  healthy: string[];
  corrupted: string[];
  missing: string[];
}> {
  const result = {
    healthy: [] as string[],
    corrupted: [] as string[],
    missing: [] as string[],
  };

  try {
    const allKeys = await AsyncStorage.getAllKeys();

    for (const key of allKeys) {
      if (key.endsWith('_backup')) {
        continue; // Skip backup keys
      }

      const data = await AsyncStorage.getItem(key);

      if (!data) {
        result.missing.push(key);
        continue;
      }

      try {
        JSON.parse(data);
        result.healthy.push(key);
      } catch {
        result.corrupted.push(key);
      }
    }
  } catch (error) {
    logError('safeStorage.diagnosePotentialCorruption', error);
  }

  return result;
}
