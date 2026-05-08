// ============================================================================
// Phase 5.13.a — wizard progress repo with 24h TTL.
//
// Persists in-progress Care Plan setup wizard state under a single key so
// the user can resume after force-quit (24h window). Anything older than
// 24h is treated as abandoned — the read clears the key and returns null.
// Malformed stored data falls back to the same null path.
// ============================================================================

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) =>
      Promise.resolve(store.has(k) ? store.get(k)! : null),
    ),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      store.delete(k);
      return Promise.resolve();
    }),
  },
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {} }));

import {
  getWizardProgress,
  saveWizardProgress,
  clearWizardProgress,
  WIZARD_PROGRESS_KEY,
} from '../../storage/wizardProgressRepo';

const NOW = new Date('2026-05-08T10:00:00Z').getTime();

beforeEach(() => {
  store.clear();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('wizardProgressRepo — save + read roundtrip', () => {
  it('reads back the same payload that was saved', async () => {
    await saveWizardProgress({
      step: 'template',
      patientName: 'Mom',
      caregiverName: 'Linda',
      startedAt: new Date(NOW).toISOString(),
    });
    const out = await getWizardProgress();
    expect(out).not.toBeNull();
    expect(out!.step).toBe('template');
    expect(out!.patientName).toBe('Mom');
    expect(out!.caregiverName).toBe('Linda');
  });

  it('uses the @embermate_wizard_progress_v1 storage key', () => {
    expect(WIZARD_PROGRESS_KEY).toBe('@embermate_wizard_progress_v1');
  });
});

describe('wizardProgressRepo — 24h TTL', () => {
  it('returns null when the saved progress is older than 24h', async () => {
    // Save with a startedAt 25h ago.
    const stale = new Date(NOW - 25 * 60 * 60 * 1000).toISOString();
    store.set(
      WIZARD_PROGRESS_KEY,
      JSON.stringify({
        step: 'who',
        patientName: 'Mom',
        startedAt: stale,
      }),
    );
    const out = await getWizardProgress();
    expect(out).toBeNull();
  });

  it('clears the stale key as a side effect of the null read', async () => {
    const stale = new Date(NOW - 25 * 60 * 60 * 1000).toISOString();
    store.set(
      WIZARD_PROGRESS_KEY,
      JSON.stringify({ step: 'who', startedAt: stale }),
    );
    await getWizardProgress();
    expect(store.has(WIZARD_PROGRESS_KEY)).toBe(false);
  });

  it('returns the payload when within the 24h window', async () => {
    const fresh = new Date(NOW - 6 * 60 * 60 * 1000).toISOString();
    await saveWizardProgress({
      step: 'confirm',
      templateId: 'aging-in-place',
      startedAt: fresh,
    });
    const out = await getWizardProgress();
    expect(out).not.toBeNull();
    expect(out!.step).toBe('confirm');
  });
});

describe('wizardProgressRepo — clear', () => {
  it('removes the key', async () => {
    await saveWizardProgress({
      step: 'who',
      startedAt: new Date(NOW).toISOString(),
    });
    expect(store.has(WIZARD_PROGRESS_KEY)).toBe(true);
    await clearWizardProgress();
    expect(store.has(WIZARD_PROGRESS_KEY)).toBe(false);
  });

  it('is a no-op when there is no saved progress', async () => {
    await expect(clearWizardProgress()).resolves.toBeUndefined();
  });
});

describe('wizardProgressRepo — malformed data', () => {
  it('returns null when the stored payload is not valid JSON', async () => {
    store.set(WIZARD_PROGRESS_KEY, 'not-json{{{');
    const out = await getWizardProgress();
    expect(out).toBeNull();
  });

  it('returns null when the stored payload is missing required fields', async () => {
    store.set(WIZARD_PROGRESS_KEY, JSON.stringify({ random: 'shape' }));
    const out = await getWizardProgress();
    expect(out).toBeNull();
  });

  it('returns null when step is not a recognised wizard step', async () => {
    store.set(
      WIZARD_PROGRESS_KEY,
      JSON.stringify({ step: 'unknown', startedAt: new Date(NOW).toISOString() }),
    );
    const out = await getWizardProgress();
    expect(out).toBeNull();
  });
});
