/**
 * Insight language quality — asserts every insight output follows the
 * <observation>. <interpretation>. <next step>. three-sentence pattern.
 *
 * Each test triggers a specific insight, then checks:
 *   1. Contains at least one '. ' (multi-sentence)
 *   2. Does not start with a metric label pattern ("X Y Pattern:")
 *   3. Length is between 60 and 220 characters (concise prose)
 */

import { generateCareInsight } from '../../utils/careInsights';
import type { TodayStats } from '../../utils/nowHelpers';

// Shared assertion helper
function assertInsightLanguage(message: string) {
  expect(message).toMatch(/\.\s/); // at least one sentence break
  expect(message).not.toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ Pattern:/); // no metric label prefix
  expect(message.length).toBeGreaterThanOrEqual(60);
  expect(message.length).toBeLessThanOrEqual(220);
}

// ── Fixtures ──

const medInstance = (name: string, status: string, hour: number) => ({
  id: `inst-${name}`, itemType: 'medication', itemName: name,
  status, scheduledTime: `2026-04-24T${String(hour).padStart(2, '0')}:00:00`,
});

const wellnessInstance = (status: string, hour: number) => ({
  id: `inst-wellness-${hour}`, itemType: 'wellness', itemName: 'Wellness check',
  status, scheduledTime: `2026-04-24T${String(hour).padStart(2, '0')}:00:00`,
});

const baseStats: TodayStats = {
  meds: { completed: 1, total: 2 },
  vitals: { completed: 0, total: 1 },
  meals: { completed: 0, total: 3 },
  water: { completed: 0, total: 8 },
};

// ── Tests ──

describe('Insight language — three-sentence concise prose', () => {
  // P1: BP med + vitals not logged (morning)
  it('vitals dependency insight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T08:00:00'));
    const stats = { ...baseStats, vitals: { completed: 0, total: 1 } };
    const instances = [medInstance('Amlodipine 5mg', 'pending', 8)];
    const result = generateCareInsight(stats, instances, 0);
    expect(result).not.toBeNull();
    assertInsightLanguage(result!.message);
    jest.useRealTimers();
  });

  // P1: Diabetes med + no water (afternoon)
  it('hydration dependency insight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T14:00:00'));
    const stats = { ...baseStats, water: { completed: 0, total: 8 } };
    const instances = [medInstance('Metformin 500mg', 'completed', 8)];
    const result = generateCareInsight(stats, instances, 1);
    expect(result).not.toBeNull();
    assertInsightLanguage(result!.message);
    jest.useRealTimers();
  });

  // P1: Meds taken + no meals (afternoon)
  it('food and medication insight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T13:00:00'));
    const stats = { ...baseStats, meds: { completed: 1, total: 2 }, meals: { completed: 0, total: 3 } };
    const instances = [medInstance('Acetaminophen 325mg', 'completed', 8)];
    const result = generateCareInsight(stats, instances, 1);
    expect(result).not.toBeNull();
    assertInsightLanguage(result!.message);
    jest.useRealTimers();
  });

  // P2: Appointment tomorrow with elevated BP
  it('visit tomorrow with elevated BP insight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T10:00:00'));
    const stats = { ...baseStats, vitals: { completed: 1, total: 1 } };
    const tomorrow = '2026-04-25';
    const appts = [{ id: 'a1', provider: 'Dr. Kim', specialty: 'Cardiology', date: tomorrow, cancelled: false, completed: false }] as any[];
    const history = { avgSystolic: 148, avgDiastolic: 92, bpReadingCount: 3, bpVsUsual: 'above_usual' as const, lunchSkipCount: 0, consecutiveMedDays: 0, daysTracked: 7 };
    const result = generateCareInsight(stats, [], 1, history, appts);
    expect(result).not.toBeNull();
    assertInsightLanguage(result!.message);
    jest.useRealTimers();
  });

  // P3: Lunch skipped pattern
  it('lunch skip pattern insight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T10:00:00'));
    const history = { lunchSkipCount: 4, bpReadingCount: 0, avgSystolic: null, avgDiastolic: null, consecutiveMedDays: 0, daysTracked: 7 };
    const result = generateCareInsight(baseStats, [], 0, history);
    expect(result).not.toBeNull();
    assertInsightLanguage(result!.message);
    jest.useRealTimers();
  });

  // P3: BP trend elevated
  it('BP trend insight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T10:00:00'));
    const history = { lunchSkipCount: 0, bpReadingCount: 5, avgSystolic: 142, avgDiastolic: 88, bpVsUsual: 'above_usual' as const, consecutiveMedDays: 0, daysTracked: 7 };
    const result = generateCareInsight(baseStats, [], 0, history);
    expect(result).not.toBeNull();
    assertInsightLanguage(result!.message);
    jest.useRealTimers();
  });

  // P3: Great consistency
  it('medication streak reinforcement insight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T10:00:00'));
    const history = { lunchSkipCount: 0, bpReadingCount: 0, avgSystolic: null, avgDiastolic: null, consecutiveMedDays: 10, daysTracked: 14 };
    const result = generateCareInsight(baseStats, [], 5, history);
    expect(result).not.toBeNull();
    assertInsightLanguage(result!.message);
    jest.useRealTimers();
  });

  // P4: Evening meds pending
  it('evening meds insight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T18:00:00'));
    const stats = { ...baseStats, meds: { completed: 0, total: 2 } };
    const instances = [
      medInstance('Lisinopril 10mg', 'pending', 18),
      medInstance('Aspirin 81mg', 'pending', 18),
    ];
    const result = generateCareInsight(stats, instances, 0);
    expect(result).not.toBeNull();
    assertInsightLanguage(result!.message);
    jest.useRealTimers();
  });

  // P4: Evening wellness pending
  it('evening wellness insight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T20:00:00'));
    const instances = [
      wellnessInstance('completed', 7),
      wellnessInstance('pending', 19),
    ];
    const result = generateCareInsight(baseStats, instances, 1);
    expect(result).not.toBeNull();
    assertInsightLanguage(result!.message);
    jest.useRealTimers();
  });
});
