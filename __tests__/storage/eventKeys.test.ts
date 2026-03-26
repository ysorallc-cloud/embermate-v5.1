import { StorageKeys, StorageKeyPrefixes } from '../../utils/storageKeys';
import { SENSITIVE_KEY_PREFIXES, isSensitiveKey } from '../../utils/safeStorage';

describe('Event storage keys', () => {
  it('StorageKeys.EVENTS exists', () => {
    expect(StorageKeys.EVENTS).toBe('@embermate_events');
  });

  it("StorageKeyPrefixes.EVENTS is 'events:'", () => {
    expect(StorageKeyPrefixes.EVENTS).toBe('events:');
  });

  it("SENSITIVE_KEY_PREFIXES includes 'events:'", () => {
    expect(SENSITIVE_KEY_PREFIXES).toContain('events:');
  });

  it("safeStorage routes any key starting with 'events:' through secure storage", () => {
    // Keys matching the event repo pattern should be flagged as sensitive
    expect(isSensitiveKey('events:default:2026-03-24')).toBe(true);
    expect(isSensitiveKey('events:patient1:2026-01-01')).toBe(true);
    expect(isSensitiveKey('events:')).toBe(true);

    // Unrelated keys should not match
    expect(isSensitiveKey('some_other_key')).toBe(false);
  });
});
