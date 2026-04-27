/**
 * Encryption round-trip tests.
 *
 * Asserts that data written via secureStorage / safeStorage:
 *   1. is stored encrypted in AsyncStorage (not plaintext)
 *   2. round-trips back to the exact original value
 *   3. surfaces a default if the ciphertext is tampered with
 *
 * Uses the real expo-crypto + crypto-js implementations (not mocked) so the
 * AES-256-CTR + HMAC-SHA256 path is genuinely exercised.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  testEncryption,
} from '../../utils/secureStorage';
import { safeSetItem, safeGetItem, isSensitiveKey } from '../../utils/safeStorage';
import { StorageKeys } from '../../utils/storageKeys';

describe('secureStorage — round-trip', () => {
  it('round-trips a string value: write → encrypted blob in AsyncStorage → decrypt equals original', async () => {
    const key = 'test_round_trip_string';
    const value = 'patient on Metformin 500mg twice daily';

    const ok = await setSecureItem(key, value);
    expect(ok).toBe(true);

    // The raw AsyncStorage value should NOT be plaintext
    const raw = await AsyncStorage.getItem(key);
    expect(raw).not.toBeNull();
    expect(raw).not.toBe(value);
    expect(raw).not.toContain('Metformin');
    // Format: v3:iv:ciphertext:tag (4 colon-separated parts)
    expect(raw!.split(':').length).toBe(4);
    expect(raw!.startsWith('v3:')).toBe(true);

    // Decrypted value matches original
    const decrypted = await getSecureItem<string>(key);
    expect(decrypted).toBe(value);
  });

  it('round-trips an object value (auto JSON serialize/parse)', async () => {
    const key = 'test_round_trip_object';
    const value = {
      name: 'Mom',
      conditions: ['hypertension', 'type-2 diabetes'],
      meds: [{ name: 'Lisinopril', dose: '10mg' }],
      lastVisit: '2026-04-01',
    };

    await setSecureItem(key, value);

    const raw = await AsyncStorage.getItem(key);
    expect(raw).not.toContain('hypertension');
    expect(raw).not.toContain('Lisinopril');

    const decrypted = await getSecureItem<typeof value>(key);
    expect(decrypted).toEqual(value);
  });

  it('round-trips an array value', async () => {
    const key = 'test_round_trip_array';
    const value = [1, 2, 3, 'four', { five: 5 }];

    await setSecureItem(key, value);
    const decrypted = await getSecureItem<typeof value>(key);
    expect(decrypted).toEqual(value);
  });

  it('returns the default value when the key does not exist', async () => {
    const result = await getSecureItem<string>('nonexistent_key', 'fallback');
    expect(result).toBe('fallback');
  });

  it('returns the default value when ciphertext is tampered with (HMAC fails)', async () => {
    const key = 'test_tamper';
    const value = 'authentic content';
    await setSecureItem(key, value);

    const raw = (await AsyncStorage.getItem(key))!;
    // Flip the last hex char of the HMAC tag — non-deterministic so we pick
    // a guaranteed-different replacement.
    const lastChar = raw.slice(-1);
    const tampered = raw.slice(0, -1) + (lastChar === '0' ? '1' : '0');
    await AsyncStorage.setItem(key, tampered);

    const result = await getSecureItem<string>(key, 'TAMPERED_DEFAULT');
    expect(result).toBe('TAMPERED_DEFAULT');
  });

  it('removeSecureItem clears the encrypted blob', async () => {
    const key = 'test_remove';
    await setSecureItem(key, 'temp');
    expect(await AsyncStorage.getItem(key)).not.toBeNull();

    await removeSecureItem(key);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });

  it('two writes of the same value produce different ciphertexts (random IV)', async () => {
    await setSecureItem('iv_test_1', 'same value');
    const blob1 = await AsyncStorage.getItem('iv_test_1');

    await setSecureItem('iv_test_2', 'same value');
    const blob2 = await AsyncStorage.getItem('iv_test_2');

    expect(blob1).not.toBe(blob2);
    // Both should still decrypt to the same value
    expect(await getSecureItem<string>('iv_test_1')).toBe('same value');
    expect(await getSecureItem<string>('iv_test_2')).toBe('same value');
  });

  it('built-in testEncryption() self-check passes (encrypt + decrypt + tamper detect)', async () => {
    const ok = await testEncryption();
    expect(ok).toBe(true);
  });
});

describe('safeStorage — sensitive-key auto-routing', () => {
  it('isSensitiveKey returns true for medication keys', () => {
    expect(isSensitiveKey(StorageKeys.MEDICATIONS)).toBe(true);
    expect(isSensitiveKey(StorageKeys.MEDICATION_LOGS)).toBe(true);
  });

  it('isSensitiveKey returns false for non-PHI keys', () => {
    expect(isSensitiveKey('@embermate_theme_pref')).toBe(false);
    expect(isSensitiveKey('arbitrary_local_flag')).toBe(false);
  });

  it('safeSetItem on a sensitive key stores ciphertext (not plaintext) in AsyncStorage', async () => {
    const key = StorageKeys.MEDICAL_INFO;
    const phi = { allergies: 'penicillin', dnr: false };

    await safeSetItem(key, phi);

    const raw = await AsyncStorage.getItem(key);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('penicillin');
    expect(raw!.startsWith('v3:')).toBe(true);

    const recovered = await safeGetItem(key, null);
    expect(recovered).toEqual(phi);
  });

  it('safeSetItem on a non-sensitive key stores plaintext JSON', async () => {
    const key = '@embermate_ui_preference';
    const value = { theme: 'dark', density: 'compact' };

    await safeSetItem(key, value);
    const raw = await AsyncStorage.getItem(key);

    // Plaintext JSON: must parse and equal the original
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(value);
    expect(raw!.startsWith('v3:')).toBe(false);
  });

  it('round-trips PHI of varying types through safeStorage', async () => {
    const cases: { key: string; value: any }[] = [
      { key: StorageKeys.MEDICATIONS, value: [{ id: 'm1', name: 'Aspirin', dose: '81mg' }] },
      { key: 'medical_info', value: { bloodType: 'O+', allergies: [] } },
      { key: 'reflection_2026-04-20', value: { date: '2026-04-20', text: 'Hard day.' } },
    ];

    for (const { key, value } of cases) {
      await safeSetItem(key, value);
      const recovered = await safeGetItem(key, null);
      expect(recovered).toEqual(value);
    }
  });
});
