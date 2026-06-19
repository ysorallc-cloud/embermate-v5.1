// ============================================================================
// encrypt-pii — close the plaintext identity-PII leak (V3 encryption sweep).
//
// The crypto + migration already work; these keys were just OFF the
// SENSITIVE_KEY_PREFIXES allowlist, so identity data sat in plaintext while
// onboarding claimed "Encrypted storage — protected like your online banking."
//
// Newly sensitive:
//   • caregiver_profile                  — caregiver name
//   • @embermate_patient_name            — patient-name plaintext mirror
//   • @embermate_patient_relationship    — patient demographics
//   • @embermate_patient_gender
//   • @embermate_patient_age
//   • @embermate_patient_language
//
// All already exist as PLAINTEXT for real users. migrateToEncryptedStorage is
// gated by ENCRYPTION_MIGRATED_V2 — already set for most users, so without a
// flag bump the sweep never re-runs and the existing plaintext stays orphaned.
// FIX: bump MIGRATION_FLAG to ENCRYPTION_MIGRATED_V3 so it re-runs once and
// re-encrypts in place. New writes encrypt on write (writers switched to
// safeSetItem).
//
// Real expo-crypto + crypto-js (no encryption mocks) — matches
// encryptionMigrationV2.test.ts.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isSensitiveKey,
  safeGetItem,
  safeSetItem,
} from '../../utils/safeStorage';
import { setSecureItem } from '../../utils/secureStorage';
import { migrateToEncryptedStorage } from '../../utils/dataMigration';
import { StorageKeys } from '../../utils/storageKeys';
import { writePatientName } from '../../utils/patientNameWriter';

const PII = {
  caregiverProfile: 'caregiver_profile',
  patientName: '@embermate_patient_name',
  relationship: '@embermate_patient_relationship',
  gender: '@embermate_patient_gender',
  age: '@embermate_patient_age',
  language: '@embermate_patient_language',
};

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}
const rawGet = (k: string) => AsyncStorage.getItem(k);
const rawSet = (k: string, v: string) => AsyncStorage.setItem(k, v);

beforeEach(async () => {
  await clearAll();
});

describe('encrypt-pii — the 6 identity keys belong to SENSITIVE_KEY_PREFIXES', () => {
  it('contract 1: caregiver_profile is sensitive', () => {
    expect(isSensitiveKey(PII.caregiverProfile)).toBe(true);
  });
  it('contract 2: @embermate_patient_name is sensitive', () => {
    expect(isSensitiveKey(PII.patientName)).toBe(true);
  });
  it('contract 3: patient relationship/gender/age/language are sensitive', () => {
    expect(isSensitiveKey(PII.relationship)).toBe(true);
    expect(isSensitiveKey(PII.gender)).toBe(true);
    expect(isSensitiveKey(PII.age)).toBe(true);
    expect(isSensitiveKey(PII.language)).toBe(true);
  });
  it('contract 4 (SCOPE BOUNDARY): non-PHI keys stay plaintext (audit log, theme, onboarding flag)', () => {
    expect(isSensitiveKey(StorageKeys.AUDIT_LOG)).toBe(false);
    expect(isSensitiveKey(StorageKeys.THEME)).toBe(false);
    expect(isSensitiveKey(StorageKeys.ONBOARDING_COMPLETE)).toBe(false);
  });
});

describe('encrypt-pii — each key round-trips encrypted (v3:, not plaintext)', () => {
  it('contract 5 (ENCRYPTED ON WRITE): every PII key stores a v3: blob with no plaintext identity in the clear', async () => {
    const samples: Record<string, any> = {
      [PII.caregiverProfile]: { name: 'Sam Rivera', shortName: 'Sam' },
      [PII.patientName]: 'Margaret',
      [PII.relationship]: 'parent',
      [PII.gender]: 'female',
      [PII.age]: '82',
      [PII.language]: 'en',
    };
    for (const [key, value] of Object.entries(samples)) {
      await safeSetItem(key, value);
      const raw = await rawGet(key);
      expect(raw).not.toBeNull();
      expect(raw!.startsWith('v3:')).toBe(true);   // encrypted on write
    }
    // No plaintext identity in the clear anywhere.
    expect(await rawGet(PII.caregiverProfile)).not.toContain('Sam Rivera');
    expect(await rawGet(PII.patientName)).not.toContain('Margaret');
    expect(await rawGet(PII.relationship)).not.toContain('parent');
  });

  it('contract 5b (DECRYPTS TO ORIGINAL): values round-trip through the sensitive read path', async () => {
    await safeSetItem(PII.caregiverProfile, { name: 'Sam Rivera', shortName: 'Sam' });
    await safeSetItem(PII.patientName, 'Margaret');
    await safeSetItem(PII.relationship, 'parent');
    await safeSetItem(PII.gender, 'female');
    expect(await safeGetItem(PII.caregiverProfile, null)).toEqual({ name: 'Sam Rivera', shortName: 'Sam' });
    expect(await safeGetItem(PII.patientName, null)).toBe('Margaret');
    expect(await safeGetItem(PII.relationship, null)).toBe('parent');
    expect(await safeGetItem(PII.gender, null)).toBe('female');
  });
});

describe('encrypt-pii — LOAD-BEARING: already-V2 user re-runs via V3 and existing plaintext is re-encrypted', () => {
  it('contract 6: V1+V2 set, NO V3, plaintext PII present → migrate re-encrypts in place, no plaintext identity remains, V3 flag set', async () => {
    // Existing user who passed V2 before these keys were sensitive.
    await rawSet(StorageKeys.ENCRYPTION_MIGRATED_V1, '2025-01-01T00:00:00.000Z');
    await rawSet(StorageKeys.ENCRYPTION_MIGRATED_V2, '2026-06-01T00:00:00.000Z');
    // Plaintext as the old code wrote it: caregiver_profile JSON; the
    // patient-name mirror as a BARE string (raw setItem); demographics as
    // JSON strings (saveBasicField → safeSetItem stringify).
    await rawSet(PII.caregiverProfile, JSON.stringify({ name: 'Sam Rivera', shortName: 'Sam' }));
    await rawSet(PII.patientName, 'Margaret');
    await rawSet(PII.relationship, JSON.stringify('parent'));
    await rawSet(PII.gender, JSON.stringify('female'));

    // Sanity: plaintext, name visible in the clear.
    expect((await rawGet(PII.patientName))).toBe('Margaret');
    expect((await rawGet(PII.caregiverProfile))!).toContain('Sam Rivera');

    await migrateToEncryptedStorage();

    // Re-encrypted in place — no plaintext identity remains.
    for (const key of [PII.caregiverProfile, PII.patientName, PII.relationship, PII.gender]) {
      const raw = await rawGet(key);
      expect(raw!.startsWith('v3:')).toBe(true);
    }
    expect(await rawGet(PII.patientName)).not.toContain('Margaret');
    expect(await rawGet(PII.caregiverProfile)).not.toContain('Sam Rivera');

    // Values intact via the sensitive read path.
    expect(await safeGetItem(PII.patientName, null)).toBe('Margaret');
    expect(await safeGetItem(PII.caregiverProfile, null)).toEqual({ name: 'Sam Rivera', shortName: 'Sam' });
    expect(await safeGetItem(PII.relationship, null)).toBe('parent');

    // The V3 flag is now set (proves it re-ran despite V2 being present).
    expect(await rawGet(StorageKeys.ENCRYPTION_MIGRATED_V3)).not.toBeNull();
  });

  it('contract 7 (IDEMPOTENT): with V3 already set, the sweep is a no-op', async () => {
    await rawSet(StorageKeys.ENCRYPTION_MIGRATED_V3, '2026-06-18T00:00:00.000Z');
    await setSecureItem(PII.patientName, 'Margaret');
    const before = await rawGet(PII.patientName);
    await migrateToEncryptedStorage();
    expect(await rawGet(PII.patientName)).toBe(before); // untouched
  });
});

describe('encrypt-pii — writers no longer write plaintext', () => {
  it('contract 8: writePatientName stores the mirror ENCRYPTED (v3:), not plaintext', async () => {
    await writePatientName('default', 'Margaret');
    const raw = await rawGet(StorageKeys.PATIENT_NAME);
    expect(raw).not.toBeNull();
    expect(raw!.startsWith('v3:')).toBe(true);
    expect(raw).not.toContain('Margaret');
    // Still readable through the canonical mirror path.
    expect(await safeGetItem(StorageKeys.PATIENT_NAME, null)).toBe('Margaret');
  });
});
