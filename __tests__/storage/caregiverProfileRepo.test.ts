// ============================================================================
// Phase 5.8.c — caregiverProfileRepo
//
// Single per-installation record. Fixed key "caregiver_profile". Mirrors
// the small-record pattern of handoffToneRepo + reflectionStorage.
// ============================================================================

const store = new Map<string, any>();

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: jest.fn((k: string, d: any) =>
    Promise.resolve(store.has(k) ? store.get(k) : d),
  ),
  safeSetItem: jest.fn((k: string, v: any) => {
    store.set(k, v);
    return Promise.resolve(true);
  }),
}));

import {
  getCaregiverProfile,
  saveCaregiverProfile,
  CAREGIVER_PROFILE_KEY,
} from '../../storage/caregiverProfileRepo';

beforeEach(() => store.clear());

describe('Phase 5.8.c — caregiverProfileRepo', () => {
  it('returns null when no profile saved', async () => {
    const p = await getCaregiverProfile();
    expect(p).toBeNull();
  });

  it('saves and retrieves a profile', async () => {
    await saveCaregiverProfile({ name: 'Sarah Cook', shortName: 'Sarah' });
    const p = await getCaregiverProfile();
    expect(p).not.toBeNull();
    expect(p?.name).toBe('Sarah Cook');
    expect(p?.shortName).toBe('Sarah');
    expect(p?.createdAt).toBeDefined();
  });

  it('preserves createdAt across save calls (does not overwrite on update)', async () => {
    await saveCaregiverProfile({ name: 'Sarah' });
    const first = await getCaregiverProfile();
    // wait a tick to make a difference visible
    await new Promise((r) => setTimeout(r, 5));
    await saveCaregiverProfile({ name: 'Sarah Updated' });
    const second = await getCaregiverProfile();
    expect(second?.createdAt).toBe(first?.createdAt);
    expect(second?.name).toBe('Sarah Updated');
  });

  it('treats whitespace-only name as missing (returns null)', async () => {
    await saveCaregiverProfile({ name: '   ' });
    const p = await getCaregiverProfile();
    expect(p).toBeNull();
  });

  it('exports the canonical key constant for audit guards', () => {
    expect(CAREGIVER_PROFILE_KEY).toBe('caregiver_profile');
  });
});
