// ============================================================================
// symptomChangeDetection — first-half vs second-half comparison of symptom
// frequency. Powers the "Symptoms that changed" Visit Prep PDF section.
//
// Retargeted: this used to mock the eventRepo `symptom_reported` stream — the
// store the live app NEVER writes, which is exactly why the empty-source bug hid
// (the test passed against the dead source). It now mocks the LIVE symptom store
// (symptomStorage.getSymptoms) with real SymptomLog shapes. The write→read path
// over the real store is covered by the integration round-trip
// (__tests__/integration/symptomProgressionRoundTrip.test.ts); this is the fast
// unit test of the classify logic against the live INPUT shape.
// ============================================================================

const mockGetSymptoms = jest.fn();

jest.mock('../../utils/symptomStorage', () => ({
  getSymptoms: (...args: any[]) => mockGetSymptoms(...args),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import { detectSymptomChanges } from '../../services/symptomChangeDetection';

const PATIENT = 'mom';

// A live symptomStorage record (one occurrence per record).
const symptomLog = (date: string, name: string, severity = 5) => ({
  id: `sym-${date}-${name}`,
  symptom: name,
  severity,
  description: '',
  timestamp: `${date}T10:00:00`,
  date,
});

beforeEach(() => {
  mockGetSymptoms.mockReset();
});

describe('detectSymptomChanges — empty + edge cases', () => {
  it('returns an empty array when there are no symptoms', async () => {
    mockGetSymptoms.mockResolvedValue([]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    expect(result).toEqual([]);
  });

  it('flags insufficient-data when range spans less than 7 days', async () => {
    mockGetSymptoms.mockResolvedValue([]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-04',
    });
    expect(result).toEqual([]);
  });
});

describe('detectSymptomChanges — change classification', () => {
  it('classifies a symptom as "new" when absent in first half but present in second', async () => {
    mockGetSymptoms.mockResolvedValue([
      symptomLog('2026-04-08', 'dizziness'),
      symptomLog('2026-04-09', 'dizziness'),
      symptomLog('2026-04-10', 'dizziness'),
    ]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    const dizzy = result.find((s) => s.symptom === 'dizziness');
    expect(dizzy).toBeDefined();
    expect(dizzy!.change).toBe('new');
    expect(dizzy!.firstHalfFreq).toBe(0);
    expect(dizzy!.secondHalfFreq).toBe(3);
  });

  it('classifies a symptom as "resolved" when present in first half but absent in second', async () => {
    mockGetSymptoms.mockResolvedValue([
      symptomLog('2026-04-01', 'headache'),
      symptomLog('2026-04-03', 'headache'),
      symptomLog('2026-04-05', 'headache'),
    ]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    const headache = result.find((s) => s.symptom === 'headache');
    expect(headache).toBeDefined();
    expect(headache!.change).toBe('resolved');
    expect(headache!.firstHalfFreq).toBe(3);
    expect(headache!.secondHalfFreq).toBe(0);
  });

  it('classifies as "worse" when frequency at least doubles in the second half', async () => {
    mockGetSymptoms.mockResolvedValue([
      symptomLog('2026-04-02', 'fatigue'),
      symptomLog('2026-04-08', 'fatigue'),
      symptomLog('2026-04-09', 'fatigue'),
      symptomLog('2026-04-10', 'fatigue'),
      symptomLog('2026-04-11', 'fatigue'),
    ]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    const fatigue = result.find((s) => s.symptom === 'fatigue');
    expect(fatigue).toBeDefined();
    expect(fatigue!.change).toBe('worse');
    expect(fatigue!.firstHalfFreq).toBe(1);
    expect(fatigue!.secondHalfFreq).toBe(4);
  });

  it('classifies as "better" when frequency at least halves in the second half', async () => {
    mockGetSymptoms.mockResolvedValue([
      symptomLog('2026-04-01', 'pain'),
      symptomLog('2026-04-02', 'pain'),
      symptomLog('2026-04-03', 'pain'),
      symptomLog('2026-04-04', 'pain'),
      symptomLog('2026-04-12', 'pain'),
    ]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    const pain = result.find((s) => s.symptom === 'pain');
    expect(pain).toBeDefined();
    expect(pain!.change).toBe('better');
  });

  it('omits symptoms with negligible change (within ±50% of frequency)', async () => {
    mockGetSymptoms.mockResolvedValue([
      symptomLog('2026-04-02', 'sniffle'),
      symptomLog('2026-04-04', 'sniffle'),
      symptomLog('2026-04-09', 'sniffle'),
      symptomLog('2026-04-11', 'sniffle'),
    ]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    expect(result.find((s) => s.symptom === 'sniffle')).toBeUndefined();
  });
});

describe('detectSymptomChanges — output shape', () => {
  it('returns at most 5 entries, ordered by magnitude of change', async () => {
    const logs: any[] = [];
    // Six "new" symptoms with descending second-half counts to verify ranking.
    const inputs = [
      { name: 'dizziness', count: 6 },
      { name: 'nausea', count: 5 },
      { name: 'tremor', count: 4 },
      { name: 'fall', count: 3 },
      { name: 'pain', count: 2 },
      { name: 'cough', count: 1 },
    ];
    for (const { name, count } of inputs) {
      for (let i = 0; i < count; i++) {
        logs.push(symptomLog(`2026-04-${10 + i}`, name));
      }
    }
    mockGetSymptoms.mockResolvedValue(logs);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result[0].symptom).toBe('dizziness');
    expect(result[1].symptom).toBe('nausea');
  });

  it('briefDescription is a plain-language string', async () => {
    mockGetSymptoms.mockResolvedValue([
      symptomLog('2026-04-09', 'dizziness'),
      symptomLog('2026-04-10', 'dizziness'),
    ]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    expect(result[0].briefDescription).toMatch(/dizziness/i);
  });
});
