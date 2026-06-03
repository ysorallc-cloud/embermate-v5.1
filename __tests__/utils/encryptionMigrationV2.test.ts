// ============================================================================
// Phase 35 — Slice 1: encryption migration V2.
//
// Adds three keys to SENSITIVE_KEY_PREFIXES so future writes go through
// the encryption layer:
//   • @embermate_logs_v2:                — per-day LogEntry buckets
//   • @embermate_all_logs_v2:            — append-only all-logs aggregate
//   • @embermate_wellness_settings       — the P5 wellness store
//
// All three already exist as PLAINTEXT in real users' AsyncStorage. The
// existing one-time migration `migrateToEncryptedStorage` is gated by a
// `ENCRYPTION_MIGRATED_V1` flag — once set, it never re-runs. Without a
// flag bump, adding these keys to SENSITIVE_KEY_PREFIXES would make the
// sensitive-path read (`getSecureItem → decryptData`) fail on the
// colon-containing plaintext JSON → return default → user's months of
// logs would APPEAR GONE.
//
// FIX: bump MIGRATION_FLAG to `ENCRYPTION_MIGRATED_V2`. The sweep re-runs
// once. The per-key `v3:`/`v2:` skip protects already-encrypted v1 keys;
// the newly-sensitive plaintext keys get encrypted in-place at the same
// AsyncStorage key (no absence window). Idempotent (flag + prefix check),
// atomic (in-place overwrite at same key).
//
// LOAD-BEARING TESTS (prior-state seeded — the standing rule):
//   1. Existing user with plaintext at the 3 new keys + V1 flag set
//      → without the V2 fix, sensitive-read returns default (REPRODUCES
//        the data-loss bug).
//      → with the V2 fix, migration re-runs, keys re-encrypted in-place,
//        sensitive-read returns the original plaintext.
//   2. Already-migrated user (V1 prior, no plaintext for new keys)
//      → V2 sweep runs once, no-ops on absent keys, no double-encryption
//        of v1-already-encrypted keys.
//   3. Per-key idempotence: a key already prefixed v3: is left untouched.
//   4. Sweep-level idempotence: second run of migrateToEncryptedStorage
//      is a no-op (V2 flag set).
//   5. cloudBackup round-trip on the 3 new keys: backup decrypts +
//      restore re-encrypts; data identical.
//
// Real expo-crypto + crypto-js exercised (no encryption mocks) — matches
// the encryptionRoundTrip.test.ts pattern.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SENSITIVE_KEY_PREFIXES,
  isSensitiveKey,
  safeGetItem,
  safeSetItem,
} from '../../utils/safeStorage';
import { setSecureItem, getSecureItem } from '../../utils/secureStorage';
import { migrateToEncryptedStorage } from '../../utils/dataMigration';
import { StorageKeys } from '../../utils/storageKeys';

const PLAINTEXT_KEYS = {
  logsDay: '@embermate_logs_v2:default:2026-06-01',
  allLogs: '@embermate_all_logs_v2:default',
  wellness: '@embermate_wellness_settings',
  logsIndex: '@embermate_logs_index_v2:default', // must NOT be sensitive
};

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

async function rawGet(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

async function rawSet(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

const SAMPLE_LOG_DAY = [
  {
    id: 'log-1',
    patientId: 'default',
    date: '2026-06-01',
    timestamp: '2026-06-01T08:00:00.000Z',
    type: 'medication',
    outcome: 'taken',
    notes: 'Took with breakfast; BP felt elevated',
  },
];
const SAMPLE_ALL_LOGS = SAMPLE_LOG_DAY;
const SAMPLE_WELLNESS = {
  morning: { enabled: true, time: '07:00', checks: ['sleep'], reminderEnabled: true, optionalChecks: {} },
  evening: { enabled: true, time: '20:00', checks: ['mood', 'notes'], reminderEnabled: true, optionalChecks: { painLevel: false } },
  afternoon: { enabled: true, time: '13:00', checks: [], reminderEnabled: true, optionalChecks: {} },
  vitals: { enabled: false, time: '08:30', types: [], reminderEnabled: false },
};

beforeEach(async () => {
  await clearAll();
});

describe('Slice 1 — three new keys belong to SENSITIVE_KEY_PREFIXES', () => {
  it('contract 1: @embermate_logs_v2: is sensitive', () => {
    expect(isSensitiveKey('@embermate_logs_v2:default:2026-06-01')).toBe(true);
  });
  it('contract 2: @embermate_all_logs_v2: is sensitive', () => {
    expect(isSensitiveKey('@embermate_all_logs_v2:default')).toBe(true);
  });
  it('contract 3: @embermate_wellness_settings is sensitive', () => {
    expect(isSensitiveKey('@embermate_wellness_settings')).toBe(true);
  });
  it('contract 4 (precise-prefix guard): the date-only @embermate_logs_index_v2: is NOT sensitive (no health content; would needlessly encrypt the index)', () => {
    expect(isSensitiveKey('@embermate_logs_index_v2:default')).toBe(false);
  });
});

describe('Slice 1 — LOAD-BEARING: existing user with plaintext + V1 flag set is recoverable via V2 sweep', () => {
  it('contract 5: PRIOR STATE — seed plaintext at the 3 new keys + V1 flag set + NO V2 flag → migrateToEncryptedStorage re-runs and re-encrypts in place', async () => {
    // Pre-flight: simulate an existing user who passed v1 migration
    // before these keys were sensitive. Their plaintext logs +
    // wellness_settings sit at the v2 keys as JSON strings.
    await rawSet(StorageKeys.ENCRYPTION_MIGRATED_V1, '2025-01-01T00:00:00.000Z');
    await rawSet(PLAINTEXT_KEYS.logsDay, JSON.stringify(SAMPLE_LOG_DAY));
    await rawSet(PLAINTEXT_KEYS.allLogs, JSON.stringify(SAMPLE_ALL_LOGS));
    await rawSet(PLAINTEXT_KEYS.wellness, JSON.stringify(SAMPLE_WELLNESS));
    // Sanity: stored as plaintext (no encryption prefix).
    const plainLogs = await rawGet(PLAINTEXT_KEYS.logsDay);
    expect(plainLogs).not.toBeNull();
    expect(plainLogs!.startsWith('v3:')).toBe(false);
    expect(plainLogs!.startsWith('v2:')).toBe(false);

    // Run the migration (V2 fix in place — sweep re-runs because
    // ENCRYPTION_MIGRATED_V2 flag is absent).
    await migrateToEncryptedStorage();

    // Post-migration: same keys hold ENCRYPTED blobs (v3: prefix),
    // not plaintext.
    const afterLogs = await rawGet(PLAINTEXT_KEYS.logsDay);
    const afterAll = await rawGet(PLAINTEXT_KEYS.allLogs);
    const afterWellness = await rawGet(PLAINTEXT_KEYS.wellness);
    expect(afterLogs!.startsWith('v3:')).toBe(true);
    expect(afterAll!.startsWith('v3:')).toBe(true);
    expect(afterWellness!.startsWith('v3:')).toBe(true);
    // And ciphertext does not leak the plaintext content.
    expect(afterLogs).not.toContain('Took with breakfast');
    expect(afterWellness).not.toContain('painLevel');

    // The sensitive-path read returns the ORIGINAL data — round-trip
    // proven end-to-end.
    const readLogs = await safeGetItem<any>(PLAINTEXT_KEYS.logsDay, null);
    expect(readLogs).toEqual(SAMPLE_LOG_DAY);
    const readAll = await safeGetItem<any>(PLAINTEXT_KEYS.allLogs, null);
    expect(readAll).toEqual(SAMPLE_ALL_LOGS);
    const readWellness = await safeGetItem<any>(PLAINTEXT_KEYS.wellness, null);
    expect(readWellness).toEqual(SAMPLE_WELLNESS);

    // V2 flag is now set.
    const v2Flag = await rawGet(StorageKeys.ENCRYPTION_MIGRATED_V2);
    expect(v2Flag).not.toBeNull();
  });

  it('contract 6: ALREADY-MIGRATED user (V1 + V2 prior, no plaintext) → sweep is a no-op (early return, no double-encryption)', async () => {
    // Pre-flight: simulate a user who's already on V2.
    await rawSet(StorageKeys.ENCRYPTION_MIGRATED_V1, '2025-01-01T00:00:00.000Z');
    await rawSet(StorageKeys.ENCRYPTION_MIGRATED_V2, '2026-06-01T00:00:00.000Z');
    // Seed a v1-already-encrypted key (e.g. medical_info via the real
    // setSecureItem path). Snapshot the ciphertext so we can prove the
    // sweep does NOT touch it.
    await setSecureItem('medical_info', { dob: '1950-01-01' });
    const beforeCipher = await rawGet('medical_info');
    expect(beforeCipher!.startsWith('v3:')).toBe(true);

    await migrateToEncryptedStorage();

    // The v1-already-encrypted key is untouched (no double-encryption).
    const afterCipher = await rawGet('medical_info');
    expect(afterCipher).toBe(beforeCipher);
  });

  it('contract 7 (PER-KEY IDEMPOTENCE): a key already prefixed v3: is skipped, not re-encrypted', async () => {
    // Pre-flight: NO V2 flag, but the v2 logs key already holds a
    // v3-encrypted blob (e.g. a user who completed an encrypted write
    // before the migration ran). The sweep must skip it via the
    // per-key prefix check.
    await rawSet(StorageKeys.ENCRYPTION_MIGRATED_V1, '2025-01-01T00:00:00.000Z');
    await setSecureItem(PLAINTEXT_KEYS.logsDay, SAMPLE_LOG_DAY);
    const before = await rawGet(PLAINTEXT_KEYS.logsDay);
    expect(before!.startsWith('v3:')).toBe(true);

    await migrateToEncryptedStorage();

    const after = await rawGet(PLAINTEXT_KEYS.logsDay);
    expect(after).toBe(before); // byte-for-byte unchanged
  });

  it('contract 8 (SWEEP IDEMPOTENCE): second call to migrateToEncryptedStorage is a no-op (V2 flag set after first run)', async () => {
    // Set up the prior-state scenario, run once, then run again and
    // verify nothing changed.
    await rawSet(StorageKeys.ENCRYPTION_MIGRATED_V1, '2025-01-01T00:00:00.000Z');
    await rawSet(PLAINTEXT_KEYS.logsDay, JSON.stringify(SAMPLE_LOG_DAY));
    await migrateToEncryptedStorage(); // first run encrypts
    const after1 = await rawGet(PLAINTEXT_KEYS.logsDay);
    expect(after1!.startsWith('v3:')).toBe(true);

    await migrateToEncryptedStorage(); // second run should early-return

    const after2 = await rawGet(PLAINTEXT_KEYS.logsDay);
    expect(after2).toBe(after1);
  });
});

describe('Slice 1 — cloudBackup round-trip on the 3 newly-sensitive keys', () => {
  it('contract 9: createEncryptedBackup + restoreEncryptedBackup round-trip; the 3 newly-sensitive keys survive backup/restore with values identical to originals', async () => {
    // Seed the 3 keys via the encryption path (post-Slice-1 state).
    await setSecureItem(PLAINTEXT_KEYS.logsDay, SAMPLE_LOG_DAY);
    await setSecureItem(PLAINTEXT_KEYS.allLogs, SAMPLE_ALL_LOGS);
    await setSecureItem(PLAINTEXT_KEYS.wellness, SAMPLE_WELLNESS);

    // Real backup API takes a password (PBKDF2-derived key).
    const PASSWORD = 'walk-test-passphrase-2026';
    const { createEncryptedBackup, restoreEncryptedBackup } = await import('../../utils/cloudBackup');
    const backup = await createEncryptedBackup(PASSWORD);
    expect(backup).not.toBeNull();

    // Wipe AsyncStorage entirely so restore has to rebuild from the
    // backup blob (the load-bearing round-trip).
    await clearAll();

    const restored = await restoreEncryptedBackup(backup!, PASSWORD);
    expect(restored).toBe(true);

    // Read back via sensitive path — values identical to originals.
    const restoredLogs = await safeGetItem<any>(PLAINTEXT_KEYS.logsDay, null);
    const restoredAll = await safeGetItem<any>(PLAINTEXT_KEYS.allLogs, null);
    const restoredWellness = await safeGetItem<any>(PLAINTEXT_KEYS.wellness, null);
    expect(restoredLogs).toEqual(SAMPLE_LOG_DAY);
    expect(restoredAll).toEqual(SAMPLE_ALL_LOGS);
    expect(restoredWellness).toEqual(SAMPLE_WELLNESS);

    // And the restored ciphertext at each key is fresh v3 (the
    // restore path re-encrypted under the device's master key, not
    // a passthrough of the backup string).
    const cipherLogs = await rawGet(PLAINTEXT_KEYS.logsDay);
    expect(cipherLogs!.startsWith('v3:')).toBe(true);
  });
});
