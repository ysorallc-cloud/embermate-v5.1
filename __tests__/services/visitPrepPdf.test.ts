/**
 * Visit Prep PDF — data assembly unit tests.
 * Tests the assembleVisitPrepData function, not the HTML/PDF rendering.
 */

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(), isAvailableAsync: jest.fn(() => Promise.resolve(true)) }));

// Storage modules — mocked so tests can drive specific fixtures
jest.mock('../../utils/medicationStorage', () => ({
  getMedications: jest.fn(),
}));
jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsInRange: jest.fn(),
}));
jest.mock('../../storage/carePlanRepo', () => ({
  listDailyInstancesRange: jest.fn(),
  DEFAULT_PATIENT_ID: 'default',
}));
jest.mock('../../storage/reflectionStorage', () => ({
  getReflection: jest.fn(),
}));

import { assembleVisitPrepData, VisitPrepConfig } from '../../services/visitPrepPdf';
import { getMedications } from '../../utils/medicationStorage';
import { getVitalsInRange } from '../../utils/vitalsStorage';
import { listDailyInstancesRange } from '../../storage/carePlanRepo';
import { getReflection } from '../../storage/reflectionStorage';

const mockGetMedications = getMedications as jest.MockedFunction<typeof getMedications>;
const mockGetVitalsInRange = getVitalsInRange as jest.MockedFunction<typeof getVitalsInRange>;
const mockListInstances = listDailyInstancesRange as jest.MockedFunction<typeof listDailyInstancesRange>;
const mockGetReflection = getReflection as jest.MockedFunction<typeof getReflection>;

const BASE_CONFIG: VisitPrepConfig = {
  dateRange: { start: '2026-04-10', end: '2026-04-24' },
  includeMeds: true,
  includeVitals: true,
  includeWellness: true,
  includeJournal: true,
  includeQuestions: true,
  questions: 'Should we adjust the Metformin dose?',
  patientName: 'Mom',
  caregiverName: 'Amber',
};

function makeMed(overrides: Partial<any> = {}) {
  return {
    id: 'm1',
    name: 'Metformin',
    dosage: '500mg',
    time: '08:00',
    timeSlot: 'morning' as const,
    taken: false,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeInstance(overrides: Partial<any> = {}): any {
  return {
    id: 'i1',
    carePlanId: 'cp1',
    carePlanItemId: 'item1',
    patientId: 'default',
    date: '2026-04-15',
    scheduledTime: '08:00',
    windowLabel: 'morning',
    windowId: 'w1',
    status: 'completed',
    itemName: 'Metformin',
    itemType: 'medication',
    priority: 'required',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-15T08:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  // Default neutral fixtures: no data of any kind
  mockGetMedications.mockResolvedValue([]);
  mockGetVitalsInRange.mockResolvedValue([]);
  mockListInstances.mockResolvedValue([]);
  mockGetReflection.mockResolvedValue(null);
});

describe('assembleVisitPrepData — shape & required sections', () => {
  it('returns all expected top-level sections', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data).toHaveProperty('header');
    expect(data).toHaveProperty('adherence');
    expect(data).toHaveProperty('vitals');
    expect(data).toHaveProperty('wellness');
    expect(data).toHaveProperty('journalHighlights');
    expect(data).toHaveProperty('questions');
    expect(data).toHaveProperty('footer');
  });

  it('header contains patient name, date range, and generated timestamp', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.header.patientName).toBe('Mom');
    expect(data.header.caregiverName).toBe('Amber');
    expect(data.header.dateRange).toContain('Apr');
    expect(data.header.generatedAt).toBeDefined();
  });

  it('footer contains the disclaimer', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.footer).toContain('Not a medical record');
  });

  it('questions section includes the free-text input', async () => {
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.questions).toContain('Metformin');
  });

  it('omits questions when includeQuestions is false', async () => {
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, includeQuestions: false });
    expect(data.questions).toBe('');
  });
});

describe('assembleVisitPrepData — medications edge cases', () => {
  it('returns empty adherence array when there are zero medications', async () => {
    mockGetMedications.mockResolvedValue([]);
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.adherence).toEqual([]);
  });

  it('only PRN medications (no scheduled instances): produces well-formed entries with rate 0%', async () => {
    // PRN = "as needed" — active medication with no daily care instances
    mockGetMedications.mockResolvedValue([
      makeMed({ id: 'prn1', name: 'Tylenol', dosage: '500mg' }),
      makeMed({ id: 'prn2', name: 'Maalox', dosage: '15ml' }),
    ]);
    mockListInstances.mockResolvedValue([]);

    const data = await assembleVisitPrepData(BASE_CONFIG);

    expect(data.adherence).toHaveLength(2);
    for (const entry of data.adherence) {
      expect(typeof entry.name).toBe('string');
      expect(entry.rate).toBeGreaterThanOrEqual(0);
      expect(entry.rate).toBeLessThanOrEqual(100);
      expect(typeof entry.missedDays).toBe('number');
    }
    expect(data.adherence.map(a => a.name)).toEqual(['Tylenol', 'Maalox']);
  });

  it('skips inactive medications', async () => {
    mockGetMedications.mockResolvedValue([
      makeMed({ id: 'm1', name: 'Active', active: true }),
      makeMed({ id: 'm2', name: 'Discontinued', active: false }),
    ]);
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.adherence.map(a => a.name)).toEqual(['Active']);
  });

  it('counts completed + skipped as taken; missed is reported separately', async () => {
    mockGetMedications.mockResolvedValue([makeMed({ name: 'Lisinopril' })]);
    mockListInstances.mockResolvedValue([
      makeInstance({ itemName: 'Lisinopril', status: 'completed' }),
      makeInstance({ itemName: 'Lisinopril', status: 'completed' }),
      makeInstance({ itemName: 'Lisinopril', status: 'skipped' }),
      makeInstance({ itemName: 'Lisinopril', status: 'missed' }),
    ]);
    const data = await assembleVisitPrepData(BASE_CONFIG);
    const entry = data.adherence.find(a => a.name === 'Lisinopril')!;
    // 3 of 4 handled (2 completed + 1 skipped) → 75%
    expect(entry.rate).toBe(75);
    expect(entry.missedDays).toBe(1);
  });

  it('omits adherence section entirely when includeMeds is false', async () => {
    mockGetMedications.mockResolvedValue([makeMed()]);
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, includeMeds: false });
    expect(data.adherence).toEqual([]);
  });
});

describe('assembleVisitPrepData — vitals', () => {
  it('groups vitals by type and computes trend + outOfRange', async () => {
    mockGetVitalsInRange.mockResolvedValue([
      { id: 'v1', type: 'systolic', value: 145, unit: 'mmHg', timestamp: '2026-04-12T08:00:00Z' },
      { id: 'v2', type: 'systolic', value: 138, unit: 'mmHg', timestamp: '2026-04-15T08:00:00Z' },
      { id: 'v3', type: 'systolic', value: 132, unit: 'mmHg', timestamp: '2026-04-18T08:00:00Z' },
      { id: 'v4', type: 'systolic', value: 128, unit: 'mmHg', timestamp: '2026-04-22T08:00:00Z' },
    ]);
    const data = await assembleVisitPrepData(BASE_CONFIG);
    const sys = data.vitals.find(v => v.type === 'systolic')!;
    expect(sys).toBeDefined();
    expect(sys.label).toBe('Systolic BP');
    expect(sys.latestValue).toBe('128 mmHg');
    expect(['up', 'down', 'stable']).toContain(sys.trend);
    // VITAL_RANGES.systolic = { low: 90, high: 140 }
    // 145 is out; 138/132/128 are all in range → outOfRange = 1
    expect(sys.outOfRange).toBe(1);
  });

  it('vitals with single reading reports trend as "unknown"', async () => {
    mockGetVitalsInRange.mockResolvedValue([
      { id: 'v1', type: 'glucose', value: 100, unit: 'mg/dL', timestamp: '2026-04-15T08:00:00Z' },
    ]);
    const data = await assembleVisitPrepData(BASE_CONFIG);
    const g = data.vitals.find(v => v.type === 'glucose')!;
    expect(g.trend).toBe('unknown');
  });

  it('omits vitals section entirely when includeVitals is false', async () => {
    mockGetVitalsInRange.mockResolvedValue([
      { id: 'v1', type: 'systolic', value: 130, unit: 'mmHg', timestamp: '2026-04-15T08:00:00Z' },
    ]);
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, includeVitals: false });
    expect(data.vitals).toEqual([]);
  });
});

describe('assembleVisitPrepData — date range edge cases', () => {
  it('handles single-day range: header shows just one date (no en dash)', async () => {
    const data = await assembleVisitPrepData({
      ...BASE_CONFIG,
      dateRange: { start: '2026-04-24', end: '2026-04-24' },
    });
    // formatDateRange returns just "Apr 24" when start === end
    expect(data.header.dateRange).toBe('Apr 24');
    expect(data.header.dateRange).not.toContain('–');
  });

  it('range crossing month boundary: header spans two months', async () => {
    const data = await assembleVisitPrepData({
      ...BASE_CONFIG,
      dateRange: { start: '2026-03-28', end: '2026-04-04' },
    });
    expect(data.header.dateRange).toContain('Mar 28');
    expect(data.header.dateRange).toContain('Apr 4');
    expect(data.header.dateRange).toContain('–');
  });

  it('range crossing year boundary: header spans Dec → Jan', async () => {
    const data = await assembleVisitPrepData({
      ...BASE_CONFIG,
      dateRange: { start: '2025-12-28', end: '2026-01-04' },
    });
    expect(data.header.dateRange).toContain('Dec 28');
    expect(data.header.dateRange).toContain('Jan 4');
  });

  it('single-day range still calls listDailyInstancesRange with same start/end', async () => {
    await assembleVisitPrepData({
      ...BASE_CONFIG,
      dateRange: { start: '2026-04-24', end: '2026-04-24' },
    });
    expect(mockListInstances).toHaveBeenCalledWith('default', '2026-04-24', '2026-04-24');
  });
});

describe('assembleVisitPrepData — patient name edge cases', () => {
  it('preserves apostrophe in patient name (e.g., "O\'Mally")', async () => {
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, patientName: "O'Mally" });
    expect(data.header.patientName).toBe("O'Mally");
  });

  it('preserves unicode in patient name (e.g., "Müller")', async () => {
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, patientName: 'Müller' });
    expect(data.header.patientName).toBe('Müller');
  });

  it('preserves angle brackets in patient name without HTML-encoding (data layer is HTML-agnostic)', async () => {
    // Note: HTML rendering happens in buildHtml — assembleVisitPrepData passes
    // the raw value through. Sanitization is the renderer's responsibility.
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, patientName: '<script>' });
    expect(data.header.patientName).toBe('<script>');
  });

  it('handles empty patient name without throwing', async () => {
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, patientName: '' });
    expect(data.header.patientName).toBe('');
  });
});

describe('assembleVisitPrepData — questions edge cases', () => {
  it('handles a very long question list (10+ items)', async () => {
    const questions = Array.from({ length: 12 }, (_, i) => `Question ${i + 1}: discuss item ${i + 1}.`).join('\n');
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, questions });
    // All 12 questions should be present in the assembled data
    for (let i = 1; i <= 12; i++) {
      expect(data.questions).toContain(`Question ${i}:`);
    }
  });

  it('trims leading/trailing whitespace from questions', async () => {
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, questions: '   What about X?   ' });
    expect(data.questions).toBe('What about X?');
  });

  it('handles empty questions string when includeQuestions is true', async () => {
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, questions: '' });
    expect(data.questions).toBe('');
  });
});

describe('assembleVisitPrepData — journal highlights', () => {
  it('caps journal highlights at 3 items even with many reflections', async () => {
    mockGetReflection.mockImplementation(async (date: string) => ({
      date,
      text: `Reflection for ${date} with some content.`,
      prompt: 'How was today?',
      savedAt: `${date}T20:00:00Z`,
    }));
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.journalHighlights.length).toBeLessThanOrEqual(3);
  });

  it('truncates long reflections with "..."', async () => {
    const longText = 'a'.repeat(150);
    mockGetReflection.mockResolvedValueOnce({
      date: '2026-04-10',
      text: longText,
      prompt: '',
      savedAt: '2026-04-10T20:00:00Z',
    });
    const data = await assembleVisitPrepData(BASE_CONFIG);
    expect(data.journalHighlights[0]).toContain('...');
  });

  it('returns empty array when includeJournal is false', async () => {
    mockGetReflection.mockResolvedValue({
      date: '2026-04-10',
      text: 'something',
      prompt: '',
      savedAt: '2026-04-10T20:00:00Z',
    });
    const data = await assembleVisitPrepData({ ...BASE_CONFIG, includeJournal: false });
    expect(data.journalHighlights).toEqual([]);
  });
});
