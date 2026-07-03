// ============================================================================
// USER-CONTROLLED BACKUP / EXPORT
//
// Gate B: the app has no cloud backup by design, so a lost/rotated encryption
// key means silent, permanent loss of a caregiver's logged history. This gives
// the user an escape hatch: export ALL local data to a portable blob and import
// it back.
//
// The export stores DECRYPTED plaintext for encrypted keys (re-encrypted under
// the current device key on import). That is deliberate: a raw-ciphertext dump
// would still be undecryptable if the device key were lost — which is the very
// failure this gate exists to survive. A value that cannot be decrypted at
// export time is preserved VERBATIM (rawCiphertext) so nothing is ever dropped;
// it can be restored and decrypted later if the key is recovered.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureItemResult, setSecureItem, isEncryptedFormat } from './secureStorage';
import { logError } from './devLog';

const BACKUP_VERSION = 1;

interface BackupEntry {
  key: string;
  /** True when the on-disk value was our recognized ciphertext and `value`
   *  holds the DECRYPTED plaintext (re-encrypt on import). */
  encrypted?: boolean;
  /** Decrypted / plaintext value (present unless `undecryptable`). */
  value?: unknown;
  /** True when the value could not be decrypted at export time and is preserved
   *  verbatim in `rawCiphertext` instead of being dropped. */
  undecryptable?: boolean;
  rawCiphertext?: string;
}

interface BackupBlob {
  version: number;
  entryCount: number;
  entries: BackupEntry[];
}

/**
 * Serialize every local AsyncStorage record into a portable string blob.
 */
export async function exportAllData(): Promise<string> {
  const keys = await AsyncStorage.getAllKeys();
  const entries: BackupEntry[] = [];

  for (const key of keys) {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) continue;

    const result = await getSecureItemResult<unknown>(key);
    if (result.ok) {
      entries.push({ key, encrypted: isEncryptedFormat(raw), value: result.value });
    } else if (result.reason === 'decrypt_failed') {
      // Never drop data: keep the ciphertext exactly as-is.
      entries.push({ key, undecryptable: true, rawCiphertext: raw });
    }
    // not_found: nothing under a key we just enumerated — skip.
  }

  const blob: BackupBlob = { version: BACKUP_VERSION, entryCount: entries.length, entries };
  return JSON.stringify(blob);
}

/**
 * Restore a blob produced by {@link exportAllData}. Encrypted entries are
 * re-encrypted under the CURRENT device key; undecryptable entries are written
 * back verbatim; plaintext entries are written as-is.
 *
 * @returns counts of restored vs skipped entries.
 */
export async function importAllData(blob: string): Promise<{ imported: number; skipped: number }> {
  let parsed: BackupBlob;
  try {
    parsed = JSON.parse(blob) as BackupBlob;
  } catch (error) {
    logError('backup.importAllData', error);
    throw new Error('Backup blob is not valid JSON');
  }

  if (!parsed || parsed.version !== BACKUP_VERSION || !Array.isArray(parsed.entries)) {
    throw new Error('Unrecognized or unsupported backup format');
  }

  let imported = 0;
  let skipped = 0;

  for (const entry of parsed.entries) {
    if (!entry || typeof entry.key !== 'string') {
      skipped++;
      continue;
    }
    try {
      if (entry.undecryptable) {
        await AsyncStorage.setItem(entry.key, entry.rawCiphertext ?? '');
      } else if (entry.encrypted) {
        await setSecureItem(entry.key, entry.value);
      } else {
        const raw =
          typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);
        await AsyncStorage.setItem(entry.key, raw);
      }
      imported++;
    } catch (error) {
      logError('backup.importAllData.entry', error, { key: entry.key });
      skipped++;
    }
  }

  return { imported, skipped };
}
