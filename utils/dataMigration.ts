// ============================================================================
// DATA MIGRATION — Plaintext → Encrypted Storage
// One-time migration that re-saves sensitive keys through the encryption layer.
// Runs at app startup; safe to re-run (idempotent via MIGRATION_FLAG).
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSecureItem } from './secureStorage';
import { isSensitiveKey } from './safeStorage';
import { devLog, logError } from './devLog';
import { StorageKeys } from './storageKeys';

// Phase 35 Slice 1 — bumped V1 → V2. The sweep iterates
// AsyncStorage.getAllKeys() and re-encrypts any isSensitiveKey() not
// already prefixed v3:/v2:. The flag bump makes it re-run ONCE for
// existing users so newly-sensitive keys get encrypted in place. The
// per-key prefix skip protects already-encrypted keys (no double-
// encryption); the in-place same-key overwrite handles atomicity (no
// absence window). Older flags stay in storage as no-op breadcrumbs.
//
// encrypt-pii — bumped V2 → V3 so the sweep re-runs ONCE more for
// already-V2 users to pick up the identity PII keys newly added to
// SENSITIVE_KEY_PREFIXES (caregiver_profile, @embermate_patient_name
// mirror, @embermate_patient_relationship/_gender/_age/_language).
const MIGRATION_FLAG = StorageKeys.ENCRYPTION_MIGRATED_V3;

export async function migrateToEncryptedStorage(): Promise<void> {
  try {
    const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_FLAG);
    if (alreadyMigrated) return;

    devLog('[Migration] Starting encryption migration...');

    const allKeys = await AsyncStorage.getAllKeys();
    let migrated = 0;

    for (const key of allKeys) {
      if (!isSensitiveKey(key)) continue;

      try {
        const plaintext = await AsyncStorage.getItem(key);
        if (!plaintext) continue;

        // Check if already encrypted (v3: or v2: format from secureStorage)
        if (plaintext.startsWith('v3:') || plaintext.startsWith('v2:')) continue;

        // Re-save through encrypted path
        await setSecureItem(key, plaintext);
        migrated++;
      } catch (err) {
        logError('dataMigration.migrateKey', err, { key });
        // Continue with other keys on failure
      }
    }

    // Set migration flag
    await AsyncStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
    devLog(`[Migration] Encryption migration complete: ${migrated} keys migrated`);
  } catch (error) {
    logError('dataMigration.migrateToEncryptedStorage', error);
    // Don't throw — migration failure shouldn't break app startup
  }
}
