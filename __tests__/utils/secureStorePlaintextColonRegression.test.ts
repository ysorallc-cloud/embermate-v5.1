// ============================================================================
// encrypt-pii REGRESSION — un-migrated plaintext with colons blanks the name.
//
// caregiver_profile stores JSON with a createdAt ISO timestamp (colons).
// Pre-encrypt-pii it was a NON-sensitive key read as plaintext. encrypt-pii
// added it to SENSITIVE_KEY_PREFIXES, so reads now route through
// getSecureItem → decryptData. For a value still in PLAINTEXT (the V3
// migration hasn't re-encrypted it yet, or a read races it), decryptData
// splits on ':' and mis-classifies the colon-bearing JSON as corrupt →
// throws → getSecureItem returns the default → the caregiver name blanks.
//
// Patient name is a BARE string (no colons) → passthrough already works,
// which is why only the caregiver greeting regressed.
//
// Real expo-crypto + crypto-js (no encryption mocks).
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCaregiverProfile,
  saveCaregiverProfile,
  CAREGIVER_PROFILE_KEY,
} from '../../storage/caregiverProfileRepo';
import { safeGetItem } from '../../utils/safeStorage';

async function clearAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  if (keys.length > 0) await AsyncStorage.multiRemove(keys as string[]);
}

beforeEach(async () => {
  await clearAll();
});

describe('encrypt-pii regression — plaintext-with-colons must not blank the name', () => {
  it('contract 1 (THE REGRESSION): un-migrated PLAINTEXT caregiver_profile (createdAt colons) still resolves the name', async () => {
    // Exactly what a 6/14 install has on disk before the V3 sweep runs:
    // a plaintext JSON object with a colon-bearing timestamp.
    const plaintext = JSON.stringify({
      name: 'Amber',
      shortName: 'Amber',
      createdAt: '2026-06-14T12:34:56.789Z',
    });
    await AsyncStorage.setItem(CAREGIVER_PROFILE_KEY, plaintext); // raw, pre-migration

    const profile = await getCaregiverProfile();
    expect(profile?.name).toBe('Amber'); // RED today: returns null → blank greeting
  });

  it('contract 2 (CONTROL — bare string still fine): plaintext patient_name passes through', async () => {
    await AsyncStorage.setItem('@embermate_patient_name', 'Dad');
    expect(await safeGetItem('@embermate_patient_name', null)).toBe('Dad');
  });

  it('contract 3 (ENCRYPTED PATH UNAFFECTED): caregiver_profile written via safeSetItem round-trips v3:', async () => {
    await saveCaregiverProfile({ name: 'Amber' });
    const raw = await AsyncStorage.getItem(CAREGIVER_PROFILE_KEY);
    expect(raw!.startsWith('v3:')).toBe(true);
    expect((await getCaregiverProfile())?.name).toBe('Amber');
  });

  it('contract 4 (NO CORRUPTION from a read): reading plaintext does not mutate the stored value', async () => {
    const plaintext = JSON.stringify({ name: 'Amber', createdAt: '2026-06-14T12:34:56.789Z' });
    await AsyncStorage.setItem(CAREGIVER_PROFILE_KEY, plaintext);
    await getCaregiverProfile();
    // The read must not have mangled/double-encrypted the at-rest value.
    expect(await AsyncStorage.getItem(CAREGIVER_PROFILE_KEY)).toBe(plaintext);
  });
});
