// ============================================================================
// Gate B hardening — the getSecureItem swallow path must not exist.
//
// The chokepoint design (safeGetItem / encryptedGetRaw route sensitive reads
// through getSecureItemResult) only holds if nobody reaches the low-level
// getSecureItem and gets a silent default on a decrypt failure. "Zero callers
// today" is a live footgun, not a resolution. This guard fails if getSecureItem
// ever swallows a HARD decrypt failure (recognized ciphertext that will not
// decrypt) into the default instead of surfacing it.
//
// RED before the fix: getSecureItem's catch returned defaultValue.
// GREEN after: getSecureItem throws SecureDecryptError on a hard failure.
// (A "soft" non-ciphertext passthrough — un-migrated bare-string plaintext —
//  still resolves, so the encrypt-pii recovery contract is preserved.)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSecureItem, getSecureItem, SecureDecryptError } from '../secureStorage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Gate B — getSecureItem has no swallow path', () => {
  it('THROWS (does not return default) on a hard decrypt failure — recognized ciphertext that will not decrypt', async () => {
    // A v3-tagged blob whose HMAC cannot verify: the real key-rotation / tamper
    // shape. A sensitive-pattern key, to match the exact footgun.
    await AsyncStorage.setItem(
      '@embermate_medications',
      'v3:00000000000000000000000000000000:deadbeef:0000',
    );
    await expect(
      getSecureItem('@embermate_medications', { fallback: true }),
    ).rejects.toBeInstanceOf(SecureDecryptError);
  });

  it('still resolves a healthy record and a genuine not-found default (no over-throwing)', async () => {
    await setSecureItem('healthy', { note: 'ok' });
    expect(await getSecureItem('healthy', null)).toEqual({ note: 'ok' });

    // Missing key = legit empty → default, NOT a throw.
    expect(await getSecureItem('missing_key', { d: true })).toEqual({ d: true });
  });

  it('preserves un-migrated bare-string plaintext (encrypt-pii) rather than throwing', async () => {
    await AsyncStorage.setItem('@embermate_patient_name', 'Dad');
    expect(await getSecureItem('@embermate_patient_name', null)).toBe('Dad');
  });
});
