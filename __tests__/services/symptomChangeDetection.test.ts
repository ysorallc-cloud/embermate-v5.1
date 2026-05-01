// ============================================================================
// symptomChangeDetection — first-half vs second-half comparison of symptom
// frequency. Powers the "Symptoms that changed" Visit Prep PDF section.
// ============================================================================

const mockGetEventsByDateRange = jest.fn();

jest.mock('../../storage/eventRepo', () => ({
  getEventsByDateRange: (...args: any[]) => mockGetEventsByDateRange(...args),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import { detectSymptomChanges } from '../../services/symptomChangeDetection';

const PATIENT = 'mom';

const symptomEvent = (date: string, name: string, severity?: string) => ({
  id: `evt-${date}-${name}`,
  type: 'symptom_reported',
  timestamp: `${date}T10:00:00`,
  patientId: PATIENT,
  metadata: { symptomName: name, severity },
  source: 'quick_log',
  createdAt: `${date}T10:00:00`,
});

beforeEach(() => {
  mockGetEventsByDateRange.mockReset();
});

describe('detectSymptomChanges — empty + edge cases', () => {
  it('returns an empty array when there are no symptom events', async () => {
    mockGetEventsByDateRange.mockResolvedValue([]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    expect(result).toEqual([]);
  });

  it('flags insufficient-data when range spans less than 7 days', async () => {
    mockGetEventsByDateRange.mockResolvedValue([]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-04',
    });
    expect(result).toEqual([]);
  });
});

describe('detectSymptomChanges — change classification', () => {
  it('classifies a symptom as "new" when absent in first half but present in second', async () => {
    mockGetEventsByDateRange.mockResolvedValue([
      symptomEvent('2026-04-08', 'dizziness'),
      symptomEvent('2026-04-09', 'dizziness'),
      symptomEvent('2026-04-10', 'dizziness'),
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
    mockGetEventsByDateRange.mockResolvedValue([
      symptomEvent('2026-04-01', 'headache'),
      symptomEvent('2026-04-03', 'headache'),
      symptomEvent('2026-04-05', 'headache'),
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
    mockGetEventsByDateRange.mockResolvedValue([
      symptomEvent('2026-04-02', 'fatigue'),
      symptomEvent('2026-04-08', 'fatigue'),
      symptomEvent('2026-04-09', 'fatigue'),
      symptomEvent('2026-04-10', 'fatigue'),
      symptomEvent('2026-04-11', 'fatigue'),
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
    mockGetEventsByDateRange.mockResolvedValue([
      symptomEvent('2026-04-01', 'pain'),
      symptomEvent('2026-04-02', 'pain'),
      symptomEvent('2026-04-03', 'pain'),
      symptomEvent('2026-04-04', 'pain'),
      symptomEvent('2026-04-12', 'pain'),
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
    mockGetEventsByDateRange.mockResolvedValue([
      symptomEvent('2026-04-02', 'sniffle'),
      symptomEvent('2026-04-04', 'sniffle'),
      symptomEvent('2026-04-09', 'sniffle'),
      symptomEvent('2026-04-11', 'sniffle'),
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
    const evts: any[] = [];
    // Six "new" symptoms with descending second-half counts to verify ranking
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
        evts.push(symptomEvent(`2026-04-${10 + i}`, name));
      }
    }
    mockGetEventsByDateRange.mockResolvedValue(evts);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result[0].symptom).toBe('dizziness');
    expect(result[1].symptom).toBe('nausea');
  });

  it('briefDescription is a plain-language string', async () => {
    mockGetEventsByDateRange.mockResolvedValue([
      symptomEvent('2026-04-09', 'dizziness'),
      symptomEvent('2026-04-10', 'dizziness'),
    ]);
    const result = await detectSymptomChanges(PATIENT, {
      start: '2026-04-01',
      end: '2026-04-14',
    });
    expect(result[0].briefDescription).toMatch(/dizziness/i);
  });
});
