// ============================================================================
// SAFE STORAGE UTILITIES
// Prevents JSON parse corruption and provides recovery mechanisms
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

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
    console.error(`[SafeStorage] JSON parse failed for key: ${key}`, error);
    console.warn(`[SafeStorage] Corrupted data detected. Using default value.`);

    // Log the corrupted data for debugging (first 100 chars)
    console.error(`[SafeStorage] Corrupted data sample: ${jsonString.substring(0, 100)}...`);

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
    console.error(`[SafeStorage] JSON stringify failed for key: ${key}`, error);
    return null;
  }
}

/**
 * Safe get with automatic JSON parsing and corruption recovery
 */
export async function safeGetItem<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const data = await AsyncStorage.getItem(key);
    return safeJSONParse(data, defaultValue, key);
  } catch (error) {
    console.error(`[SafeStorage] AsyncStorage.getItem failed for key: ${key}`, error);
    return defaultValue;
  }
}

/**
 * Safe set with automatic JSON stringification.
 * Backup-on-write removed to reduce I/O overhead (was tripling AsyncStorage operations).
 * Backups are handled by the cloudBackup system on explicit user action.
 */
export async function safeSetItem<T>(
  key: string,
  value: T
): Promise<boolean> {
  try {
    // Stringify the data
    const jsonString = safeJSONStringify(value, key);

    if (jsonString === null) {
      console.error(`[SafeStorage] Failed to stringify data for key: ${key}`);
      return false;
    }

    // Save the new value
    await AsyncStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    console.error(`[SafeStorage] AsyncStorage.setItem failed for key: ${key}`, error);
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
    if (__DEV__) console.log(`[SafeStorage] Attempting to recover from backup for key: ${key}`);

    const backupData = await AsyncStorage.getItem(`${key}_backup`);
    if (!backupData) {
      if (__DEV__) console.warn(`[SafeStorage] No backup found for key: ${key}`);
      return defaultValue;
    }

    const recovered = safeJSONParse(backupData, defaultValue, `${key}_backup`);

    // If recovery successful, restore it as the main value
    if (recovered !== defaultValue) {
      await AsyncStorage.setItem(key, backupData);
      if (__DEV__) console.log(`[SafeStorage] Successfully recovered from backup for key: ${key}`);
    }

    return recovered;
  } catch (error) {
    console.error(`[SafeStorage] Backup recovery failed for key: ${key}`, error);
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
    if (__DEV__) console.log(`[SafeStorage] Validation passed after recovery for key: ${key}`);
    return recovered;
  }

  console.error(`[SafeStorage] Could not recover valid data for key: ${key}. Using default.`);
  return defaultValue;
}

/**
 * Clear corrupted data and backups
 */
export async function clearCorruptedData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    await AsyncStorage.removeItem(`${key}_backup`);
    if (__DEV__) console.log(`[SafeStorage] Cleared corrupted data for key: ${key}`);
  } catch (error) {
    console.error(`[SafeStorage] Failed to clear data for key: ${key}`, error);
  }
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
    console.error('[SafeStorage] Diagnostic failed', error);
  }

  return result;
}
