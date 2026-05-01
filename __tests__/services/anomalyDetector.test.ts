// ============================================================================
// anomalyDetector — Prompt 6 Phase 3.
//
// Looks at the just-logged event and, when warranted, emits a context-
// anchored prompt that overrides the generic toast scaffolding. Three
// signals tracked:
//   • Vital reading > 1.5σ from 30-day average (per-vital-type)
//   • Missed-med streak > 2 consecutive scheduled doses
//   • Mood / energy / sleep dropped > 2 points from previous 7-day average
//
// Stop condition: requires 14+ days of baseline before firing — early days
// produce too much noise.
// ============================================================================

const mockGetVitalsByType = jest.fn();
const mockListLogsInRange = jest.fn();
const mockListDailyInstancesRange = jest.fn();
const mockGetRangeWithMissingDays = jest.fn();

jest.mock('../../utils/vitalsStorage', () => ({
  getVitalsByType: (...args: any[]) => mockGetVitalsByType(...args),
}));

jest.mock('../../storage/carePlanRepo', () => ({
  listLogsInRange: (...args: any[]) => mockListLogsInRange(...args),
  listDailyInstancesRange: (...args: any[]) => mockListDailyInstancesRange(...args),
  DEFAULT_PATIENT_ID: 'default',
}));

jest.mock('../../storage/dailyReflectionRepo', () => ({
  getRangeWithMissingDays: (...args: any[]) => mockGetRangeWithMissingDays(...args),
}));

jest.mock('../../utils/devLog', () => ({ logError: jest.fn() }));

import { detectAnomalies } from '../../services/anomalyDetector';

const PATIENT = 'mom';

const reading = (date: string, type: string, value: number) => ({
  id: `vit-${date}-${type}`,
  type,
  value,
  unit: '',
  timestamp: `${date}T08:00:00`,
});

const reflectionPoint = (date: string, mood?: number, energy?: number, sleep?: number) => ({
  date,
  reflection: { date, mood, energyLevel: energy, sleepQuality: sleep } as any,
});

const log = (date: string, outcome: 'taken' | 'skipped' | 'missed' | 'completed', itemName: string) => ({
  id: `log-${date}-${outcome}`,
  patientId: PATIENT,
  timestamp: `${date}T08:00:00`,
  date,
  outcome,
  source: 'now',
  immutable: true as const,
  createdAt: `${date}T08:00:00`,
  data: { type: 'medication', medicationName: itemName },
});

beforeEach(() => {
  mockGetVitalsByType.mockReset();
  mockListLogsInRange.mockReset();
  mockListDailyInstancesRange.mockReset();
  mockGetRangeWithMissingDays.mockReset();
  mockGetVitalsByType.mockResolvedValue([]);
  mockListLogsInRange.mockResolvedValue([]);
  mockListDailyInstancesRange.mockResolvedValue([]);
  mockGetRangeWithMissingDays.mockResolvedValue([]);
});

describe('detectAnomalies — empty / insufficient baseline', () => {
  it('returns no anomalies when there are zero events', async () => {
    const result = await detectAnomalies(PATIENT, {
      kind: 'medication_taken',
      now: new Date('2026-04-30T12:00:00'),
    });
    expect(result).toEqual([]);
  });

  it('returns no anomalies when baseline < 14 days (Prompt 6 stop condition)', async () => {
    // 5 days of vitals — under threshold
    const readings = Array.from({ length: 5 }, (_, i) =>
      reading(`2026-04-${20 + i}`, 'systolic', 130),
    );
    readings.push(reading('2026-04-30', 'systolic', 200)); // would be a flagged outlier
    mockGetVitalsByType.mockResolvedValue(readings);
    const result = await detectAnomalies(PATIENT, {
      kind: 'vital_recorded',
      vitalType: 'systolic',
      vitalValue: 200,
      now: new Date('2026-04-30T12:00:00'),
    });
    expect(result).toEqual([]);
  });
});

describe('detectAnomalies — vital > 1.5σ from 30-day average', () => {
  it('flags a high systolic outlier with patient-natural language', async () => {
    // 30 readings averaging ~128 with low variance, then a 148 outlier today.
    const baseline = Array.from({ length: 30 }, (_, i) =>
      reading(`2026-04-${String(i + 1).padStart(2, '0')}`, 'systolic', 128 + (i % 3)),
    );
    mockGetVitalsByType.mockResolvedValue(baseline);
    const result = await detectAnomalies(PATIENT, {
      kind: 'vital_recorded',
      vitalType: 'systolic',
      vitalValue: 148,
      now: new Date('2026-04-30T12:00:00'),
    });
    expect(result.length).toBeGreaterThan(0);
    const a = result[0];
    expect(a.kind).toBe('vital_outlier');
    expect(a.suggestedQuestion).toContain('148');
    expect(a.suggestedQuestion.toLowerCase()).toContain('higher than her usual');
  });

  it('does not flag readings within 1.5σ', async () => {
    const baseline = Array.from({ length: 30 }, (_, i) =>
      reading(`2026-04-${String(i + 1).padStart(2, '0')}`, 'systolic', 128 + (i % 5)),
    );
    mockGetVitalsByType.mockResolvedValue(baseline);
    const result = await detectAnomalies(PATIENT, {
      kind: 'vital_recorded',
      vitalType: 'systolic',
      vitalValue: 132,
      now: new Date('2026-04-30T12:00:00'),
    });
    expect(result).toEqual([]);
  });
});

describe('detectAnomalies — missed-med streak > 2', () => {
  it('flags 3 consecutive missed scheduled doses', async () => {
    const days = Array.from({ length: 30 }, (_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`);
    // First 27 days: all completed. Last 3: missed.
    const logs = [
      ...days.slice(0, 27).map((d) => log(d, 'taken', 'Metformin')),
      log('2026-04-28', 'missed', 'Metformin'),
      log('2026-04-29', 'missed', 'Metformin'),
      log('2026-04-30', 'missed', 'Metformin'),
    ];
    mockListLogsInRange.mockResolvedValue(logs);
    const result = await detectAnomalies(PATIENT, {
      kind: 'medication_taken',
      now: new Date('2026-04-30T12:00:00'),
    });
    const streak = result.find((a) => a.kind === 'missed_streak');
    expect(streak).toBeDefined();
    expect(streak!.suggestedQuestion.toLowerCase()).toContain('3');
  });

  it('does not flag a 2-day miss (under threshold)', async () => {
    const days = Array.from({ length: 30 }, (_, i) => `2026-04-${String(i + 1).padStart(2, '0')}`);
    const logs = [
      ...days.slice(0, 28).map((d) => log(d, 'taken', 'Metformin')),
      log('2026-04-29', 'missed', 'Metformin'),
      log('2026-04-30', 'missed', 'Metformin'),
    ];
    mockListLogsInRange.mockResolvedValue(logs);
    const result = await detectAnomalies(PATIENT, {
      kind: 'medication_taken',
      now: new Date('2026-04-30T12:00:00'),
    });
    expect(result.find((a) => a.kind === 'missed_streak')).toBeUndefined();
  });
});

describe('detectAnomalies — mood/energy/sleep drop > 2 from 7-day avg', () => {
  it('flags a mood drop after a stable 7-day baseline', async () => {
    const points = [
      reflectionPoint('2026-04-23', 4, 4, 4),
      reflectionPoint('2026-04-24', 4, 4, 4),
      reflectionPoint('2026-04-25', 4, 4, 4),
      reflectionPoint('2026-04-26', 5, 4, 4),
      reflectionPoint('2026-04-27', 4, 4, 4),
      reflectionPoint('2026-04-28', 5, 4, 4),
      reflectionPoint('2026-04-29', 4, 4, 4),
      reflectionPoint('2026-04-30', 1, 4, 4), // big drop in mood
    ];
    mockGetRangeWithMissingDays.mockResolvedValue(points);
    const result = await detectAnomalies(PATIENT, {
      kind: 'reflection_logged',
      now: new Date('2026-04-30T12:00:00'),
    });
    const a = result.find((x) => x.kind === 'mood_drop');
    expect(a).toBeDefined();
    expect(a!.suggestedQuestion.toLowerCase()).toContain('mood');
  });

  it('does not flag a 1-point dip (under threshold)', async () => {
    const points = [
      reflectionPoint('2026-04-24', 4, 4, 4),
      reflectionPoint('2026-04-25', 4, 4, 4),
      reflectionPoint('2026-04-26', 4, 4, 4),
      reflectionPoint('2026-04-27', 4, 4, 4),
      reflectionPoint('2026-04-28', 4, 4, 4),
      reflectionPoint('2026-04-29', 4, 4, 4),
      reflectionPoint('2026-04-30', 3, 4, 4), // dropped 1 point
    ];
    mockGetRangeWithMissingDays.mockResolvedValue(points);
    const result = await detectAnomalies(PATIENT, {
      kind: 'reflection_logged',
      now: new Date('2026-04-30T12:00:00'),
    });
    expect(result.find((a) => a.kind === 'mood_drop')).toBeUndefined();
  });
});

describe('detectAnomalies — output shape', () => {
  it('every anomaly has whyItMatters + suggestedQuestion strings', async () => {
    const baseline = Array.from({ length: 30 }, (_, i) =>
      reading(`2026-04-${String(i + 1).padStart(2, '0')}`, 'systolic', 128),
    );
    mockGetVitalsByType.mockResolvedValue(baseline);
    const result = await detectAnomalies(PATIENT, {
      kind: 'vital_recorded',
      vitalType: 'systolic',
      vitalValue: 160,
      now: new Date('2026-04-30T12:00:00'),
    });
    for (const a of result) {
      expect(typeof a.whyItMatters).toBe('string');
      expect(a.whyItMatters.length).toBeGreaterThan(0);
      expect(typeof a.suggestedQuestion).toBe('string');
      expect(a.suggestedQuestion.length).toBeGreaterThan(0);
    }
  });
});
