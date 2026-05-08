// ============================================================================
// Phase 5.13.g — resume the Care Plan setup wizard after a force-quit.
//
// On launch, getPendingWizardResume() peeks at saved progress and returns
// either the path to redirect to or null. Step 'who' is intentionally NOT
// resumable: only the patient name was entered, so the user lands on the
// normal initial route. Steps 'template' and 'confirm' resume in place.
// Stale (>24h) progress is cleared by the underlying repo read.
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

import { getPendingWizardResume } from '../../services/wizardResume';
import { WIZARD_PROGRESS_KEY } from '../../storage/wizardProgressRepo';

const NOW = new Date('2026-05-08T10:00:00Z').getTime();

beforeEach(() => {
  store.clear();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('wizardResume — getPendingWizardResume', () => {
  it('returns null when there is no saved progress', async () => {
    const out = await getPendingWizardResume();
    expect(out).toBeNull();
  });

  it('routes to /care-plan/setup/template when progress is at step template', async () => {
    store.set(
      WIZARD_PROGRESS_KEY,
      JSON.stringify({
        step: 'template',
        patientName: 'Mom',
        caregiverName: 'Linda',
        startedAt: new Date(NOW).toISOString(),
      }),
    );
    const out = await getPendingWizardResume();
    expect(out).toBe('/care-plan/setup/template');
  });

  it('routes to /care-plan/setup/confirm when progress is at step confirm', async () => {
    store.set(
      WIZARD_PROGRESS_KEY,
      JSON.stringify({
        step: 'confirm',
        templateId: 'aging-in-place',
        startedAt: new Date(NOW - 6 * 60 * 60 * 1000).toISOString(),
      }),
    );
    const out = await getPendingWizardResume();
    expect(out).toBe('/care-plan/setup/confirm');
  });

  it('returns null when progress is at step who (insufficient state to resume)', async () => {
    // Only the patient name was entered — not worth a forced redirect.
    store.set(
      WIZARD_PROGRESS_KEY,
      JSON.stringify({
        step: 'who',
        patientName: 'Mom',
        startedAt: new Date(NOW).toISOString(),
      }),
    );
    const out = await getPendingWizardResume();
    expect(out).toBeNull();
  });

  it('returns null and clears progress when older than 24h', async () => {
    const stale = new Date(NOW - 25 * 60 * 60 * 1000).toISOString();
    store.set(
      WIZARD_PROGRESS_KEY,
      JSON.stringify({
        step: 'template',
        patientName: 'Mom',
        startedAt: stale,
      }),
    );
    const out = await getPendingWizardResume();
    expect(out).toBeNull();
    // Side effect of the underlying repo: stale key is wiped.
    expect(store.has(WIZARD_PROGRESS_KEY)).toBe(false);
  });

  it('returns null when stored payload is malformed', async () => {
    store.set(WIZARD_PROGRESS_KEY, 'not-json{{{');
    const out = await getPendingWizardResume();
    expect(out).toBeNull();
  });
});
