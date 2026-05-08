// ============================================================================
// Phase 5.13.2 — setAppliedTemplateId persists the chosen template id on
// CarePlanConfig. The field is optional, so legacy configs that lack it
// still load fine; the wizard's apply path stamps it after enabling buckets
// so the welcome card can echo "Aging in Place template applied" back.
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

jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(key: string, fallback: T): Promise<T> => {
    const raw = store.get(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  safeSetItem: async (key: string, value: any): Promise<boolean> => {
    store.set(key, JSON.stringify(value));
    return true;
  },
}));

jest.mock('../../lib/events', () => ({
  emitDataUpdate: jest.fn(),
}));

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

import {
  getOrCreateCarePlanConfig,
  setAppliedTemplateId,
  getCarePlanConfig,
} from '../../storage/carePlanConfigRepo';

beforeEach(() => {
  store.clear();
});

describe('setAppliedTemplateId', () => {
  it('writes the templateId onto the patient config', async () => {
    await getOrCreateCarePlanConfig('default');
    await setAppliedTemplateId('default', 'elderly');
    const config = await getCarePlanConfig('default');
    expect((config as any)?.appliedTemplateId).toBe('elderly');
  });

  it('overwrites an earlier templateId on the same patient', async () => {
    await getOrCreateCarePlanConfig('default');
    await setAppliedTemplateId('default', 'elderly');
    await setAppliedTemplateId('default', 'post-surgical');
    const config = await getCarePlanConfig('default');
    expect((config as any)?.appliedTemplateId).toBe('post-surgical');
  });

  it('clears the field when templateId is null', async () => {
    await getOrCreateCarePlanConfig('default');
    await setAppliedTemplateId('default', 'elderly');
    await setAppliedTemplateId('default', null);
    const config = await getCarePlanConfig('default');
    expect((config as any)?.appliedTemplateId).toBeUndefined();
  });

  it('creates a config when none exists', async () => {
    await setAppliedTemplateId('default', 'elderly');
    const config = await getCarePlanConfig('default');
    expect(config).not.toBeNull();
    expect((config as any)?.appliedTemplateId).toBe('elderly');
  });
});
