// ============================================================================
// Phase 5.10.a — Sleep, Energy & Mood Patterns
//
// Replaces the legacy "Wellness" section. Pulls per-day reflection points
// (sleepQuality, mood, energyLevel) for the visit-prep window AND the
// equal-length prior window so the doctor sees variance and trend rather
// than a flat average.
// ============================================================================

const mockGetRangeWithMissingDays = jest.fn();

jest.mock('../../storage/dailyReflectionRepo', () => ({
  getRangeWithMissingDays: (...a: any[]) => mockGetRangeWithMissingDays(...a),
}));

import { buildWellnessPatterns } from '../../services/wellnessPatterns';

beforeEach(() => {
  jest.clearAllMocks();
});

function reflectionPoint(
  date: string,
  values: { sleepQuality?: number; mood?: number; energyLevel?: number } = {},
) {
  return {
    date,
    reflection: {
      patientId: 'p1',
      date,
      sleepQuality: values.sleepQuality,
      mood: values.mood,
      energyLevel: values.energyLevel,
    },
  };
}

describe('Phase 5.10.a — buildWellnessPatterns', () => {
  it('returns null shape when no reflection points exist in either window', async () => {
    mockGetRangeWithMissingDays.mockResolvedValue([]);
    const out = await buildWellnessPatterns({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-25' },
    });
    expect(out.sleep).toBeNull();
    expect(out.energy).toBeNull();
    expect(out.mood).toBeNull();
  });

  it('reports sleep avg + prior-window comparison when both windows have data', async () => {
    mockGetRangeWithMissingDays.mockImplementation(
      async (_pid: string, start: string) => {
        if (start === '2026-04-19') {
          // Current window — avg 3.2
          return [
            reflectionPoint('2026-04-19', { sleepQuality: 3 }),
            reflectionPoint('2026-04-20', { sleepQuality: 3 }),
            reflectionPoint('2026-04-21', { sleepQuality: 4 }),
            reflectionPoint('2026-04-22', { sleepQuality: 3 }),
            reflectionPoint('2026-04-23', { sleepQuality: 3 }),
          ];
        }
        // Prior window — avg 3.8
        return [
          reflectionPoint('2026-04-14', { sleepQuality: 4 }),
          reflectionPoint('2026-04-15', { sleepQuality: 4 }),
          reflectionPoint('2026-04-16', { sleepQuality: 4 }),
          reflectionPoint('2026-04-17', { sleepQuality: 3 }),
          reflectionPoint('2026-04-18', { sleepQuality: 4 }),
        ];
      },
    );
    const out = await buildWellnessPatterns({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-23' },
    });
    expect(out.sleep).not.toBeNull();
    expect(out.sleep!.avgQuality).toBeCloseTo(3.2, 1);
    expect(out.sleep!.priorAvg).toBeCloseTo(3.8, 1);
  });

  it('lists poor-night dates (quality < 2)', async () => {
    mockGetRangeWithMissingDays.mockImplementation(async () => [
      reflectionPoint('2026-04-19', { sleepQuality: 1 }),
      reflectionPoint('2026-04-20', { sleepQuality: 4 }),
      reflectionPoint('2026-04-21', { sleepQuality: 1 }),
    ]);
    const out = await buildWellnessPatterns({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-21' },
    });
    expect(out.sleep!.poorNights.map((p) => p.date)).toEqual([
      '2026-04-19', '2026-04-21',
    ]);
  });

  it('counts afternoon-dip days (energyLevel <= 2 on days where sleepQuality also <= 3)', async () => {
    // The simple correlation: same-day low sleep + low energy.
    mockGetRangeWithMissingDays.mockImplementation(async () => [
      reflectionPoint('2026-04-19', { sleepQuality: 2, energyLevel: 2 }),
      reflectionPoint('2026-04-20', { sleepQuality: 4, energyLevel: 4 }),
      reflectionPoint('2026-04-21', { sleepQuality: 2, energyLevel: 2 }),
      reflectionPoint('2026-04-22', { sleepQuality: 3, energyLevel: 3 }),
      reflectionPoint('2026-04-23', { sleepQuality: 5, energyLevel: 4 }),
    ]);
    const out = await buildWellnessPatterns({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-23' },
    });
    expect(out.energy).not.toBeNull();
    expect(out.energy!.afternoonDipDays).toBe(2);
    // Correlation: of the 2 dip days, 2 also had low sleep.
    expect(out.energy!.correlatesWithPoorSleep).toBe(2);
  });

  it('lists difficult-morning dates (mood <= 2)', async () => {
    mockGetRangeWithMissingDays.mockImplementation(async () => [
      reflectionPoint('2026-04-19', { mood: 1 }),
      reflectionPoint('2026-04-20', { mood: 4 }),
      reflectionPoint('2026-04-21', { mood: 2 }),
    ]);
    const out = await buildWellnessPatterns({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-21' },
    });
    expect(out.mood!.difficultMornings.map((d) => d.date)).toEqual([
      '2026-04-19', '2026-04-21',
    ]);
  });

  it('handles missing reflection days gracefully (no crash on null reflection)', async () => {
    mockGetRangeWithMissingDays.mockImplementation(async () => [
      { date: '2026-04-19', reflection: null },
      reflectionPoint('2026-04-20', { sleepQuality: 4 }),
    ]);
    const out = await buildWellnessPatterns({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-20' },
    });
    expect(out.sleep!.avgQuality).toBeCloseTo(4, 0); // single non-null sample
  });

  it('returns earlierWaking flag when poor sleep concentrates in second half of window', async () => {
    // Simple heuristic: ≥3 of last 5 days < 3 quality.
    mockGetRangeWithMissingDays.mockImplementation(async () => [
      reflectionPoint('2026-04-19', { sleepQuality: 4 }),
      reflectionPoint('2026-04-20', { sleepQuality: 4 }),
      reflectionPoint('2026-04-21', { sleepQuality: 4 }),
      reflectionPoint('2026-04-22', { sleepQuality: 5 }),
      reflectionPoint('2026-04-23', { sleepQuality: 2 }),
      reflectionPoint('2026-04-24', { sleepQuality: 2 }),
      reflectionPoint('2026-04-25', { sleepQuality: 1 }),
    ]);
    const out = await buildWellnessPatterns({
      patientId: 'p1',
      dateRange: { start: '2026-04-19', end: '2026-04-25' },
    });
    expect(out.sleep!.earlierWaking).toBe(true);
  });
});
