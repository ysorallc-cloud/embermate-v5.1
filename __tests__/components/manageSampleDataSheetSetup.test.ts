// ============================================================================
// "Set up my loved one" — post-sample setup contract
//
// Reproduces a real-device bug surfaced 2026-05-06: tapping "Set up my loved
// one" from sample mode and entering a name (e.g. "Linda") left the SELF/
// default patient renamed to "Linda" but with relationship: 'self' still
// attached. Result: PatientSwitcherModal labels the user themselves as the
// loved one ("Linda — You"), and any subsequently-added real patient renders
// as a duplicate with the same name.
//
// The bug: ManageSampleDataSheet.handleSetUp hardcoded
//   writePatientName('default', trimmed)
// which only updates `name`, never clears the `relationship: 'self'` marker
// that the default registry seeds for the user themselves.
//
// Contract this test locks:
//   1. The post-setup registry has the active patient renamed to the input.
//   2. The active patient's `relationship` is NOT 'self' (a loved one is not
//      the user themselves).
//   3. StorageKeys.PATIENT_NAME mirror is updated for legacy readers.
//   4. EVENT.PATIENT and EVENT.SAMPLE_DATA_CLEARED both fire.
//   5. clearSampleData is invoked before the registry write.
// ============================================================================

import { DEFAULT_PATIENT_ID } from '../../types/patient';

// In-memory AsyncStorage so the real patientRegistry module can read/write.
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
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((k) => store.delete(k));
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
  },
  getItem: jest.fn((k: string) =>
    Promise.resolve(store.has(k) ? store.get(k)! : null),
  ),
  setItem: jest.fn((k: string, v: string) => {
    store.set(k, v);
    return Promise.resolve();
  }),
}));

// safeStorage wraps AsyncStorage with JSON parse/stringify. Use a thin shim
// that talks to the same `store` so registry round-trips cleanly.
jest.mock('../../utils/safeStorage', () => ({
  safeGetItem: async <T,>(k: string, fallback: T): Promise<T> => {
    const raw = store.get(k);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  safeSetItem: async (k: string, v: any): Promise<void> => {
    store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  },
}));

// Avoid pulling the subscription / feature-gate graph for this test.
jest.mock('../../storage/subscriptionRepo', () => ({
  getSubscriptionState: async () => ({ tier: 'free' }),
}));

jest.mock('../../types/subscription', () => ({
  TIER_LIMITS: { free: { maxPatients: 5 } },
}));

// Capture event emissions.
const emitSpy = jest.fn();
jest.mock('../../lib/events', () => ({
  emitDataUpdate: (cat: string) => emitSpy(cat),
}));

jest.mock('../../lib/eventNames', () => ({
  EVENT: { PATIENT: 'patient', SAMPLE_DATA_CLEARED: 'sample_data_cleared' },
}));

// clearSampleData is mocked to spy on call ordering — its internals are
// covered elsewhere.
const clearSpy = jest.fn().mockResolvedValue({ success: true, clearedCount: 0, errors: [] });
jest.mock('../../utils/sampleDataManager', () => ({
  clearSampleData: () => clearSpy(),
}));

jest.mock('../../utils/devLog', () => ({
  devLog: () => {},
  logError: () => {},
}));

// The unit under test — the helper that ManageSampleDataSheet.handleSetUp
// must delegate to. Will fail to import until the helper exists; that's the
// red phase.
import { setUpLovedOneFromSample } from '../../utils/setUpLovedOneFromSample';
import { getPatientRegistry } from '../../storage/patientRegistry';
import { StorageKeys } from '../../utils/storageKeys';

beforeEach(() => {
  store.clear();
  emitSpy.mockClear();
  clearSpy.mockClear();
});

describe('setUpLovedOneFromSample — sample-mode → real-patient transition', () => {
  it('renames the active patient to the entered name', async () => {
    await setUpLovedOneFromSample('Linda');
    const reg = await getPatientRegistry();
    const active = reg.patients.find((p) => p.id === reg.activePatientId);
    expect(active?.name).toBe('Linda');
  });

  it('clears the SELF marker — a loved one is not the user themselves', async () => {
    // Default registry seeds the only patient as relationship: 'self'.
    // After setting up a loved one, that marker MUST be gone.
    await setUpLovedOneFromSample('Linda');
    const reg = await getPatientRegistry();
    const active = reg.patients.find((p) => p.id === reg.activePatientId);
    expect(active?.relationship).not.toBe('self');
  });

  it('mirrors the new name to StorageKeys.PATIENT_NAME for legacy readers', async () => {
    await setUpLovedOneFromSample('Linda');
    expect(store.get(StorageKeys.PATIENT_NAME)).toBe('Linda');
  });

  it('emits EVENT.PATIENT and EVENT.SAMPLE_DATA_CLEARED', async () => {
    await setUpLovedOneFromSample('Linda');
    const events = emitSpy.mock.calls.map((c) => c[0]);
    expect(events).toEqual(expect.arrayContaining(['patient', 'sample_data_cleared']));
  });

  it('clears sample data before writing the new patient', async () => {
    let clearOrder = -1;
    let writeOrder = -1;
    let n = 0;
    clearSpy.mockImplementationOnce(async () => {
      clearOrder = n++;
      return { success: true, clearedCount: 0, errors: [] };
    });
    const origEmit = emitSpy.getMockImplementation();
    emitSpy.mockImplementation((cat: string) => {
      if (cat === 'patient' && writeOrder === -1) writeOrder = n++;
      if (origEmit) origEmit(cat);
    });
    await setUpLovedOneFromSample('Linda');
    expect(clearOrder).toBeGreaterThanOrEqual(0);
    expect(writeOrder).toBeGreaterThan(clearOrder);
  });

  it('trims whitespace and ignores empty input', async () => {
    await setUpLovedOneFromSample('   ');
    // Empty input is a no-op — registry untouched, no events, no clear.
    expect(clearSpy).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
    const reg = await getPatientRegistry();
    const active = reg.patients.find((p) => p.id === reg.activePatientId);
    expect(active?.name).toBe('Patient'); // default registry untouched
    expect(active?.id).toBe(DEFAULT_PATIENT_ID);
  });

  it('keeps the registry at one patient — no orphan duplicate created', async () => {
    await setUpLovedOneFromSample('Linda');
    const reg = await getPatientRegistry();
    expect(reg.patients).toHaveLength(1);
  });
});
