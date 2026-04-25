import { generateCareInsight } from '../../utils/careInsights';
import type { TodayStats } from '../../utils/nowHelpers';

describe('generateCareInsight — diabetes + hydration check', () => {
  // careInsights.ts:87 originally referenced `stats.hydration?.completed`
  // but TodayStats uses `water?: StatData`. The field was renamed during a
  // refactor but this call site was missed, so the insight never fired.

  const diabetesInstance = {
    id: 'inst-1',
    itemType: 'medication',
    itemName: 'Metformin 500mg',
    status: 'completed',
    scheduledTime: '08:00',
  };

  // Force the hour past noon so the time-of-day gate (currentHour >= 12)
  // doesn't suppress the insight. We mock Date to 1 PM.
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T13:00:00'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('fires the hydration insight when water.completed is 0 and a diabetes med was taken', () => {
    const stats: TodayStats = {
      meds: { completed: 1, total: 2 },
      vitals: { completed: 0, total: 0 },
      meals: { completed: 0, total: 3 },
      water: { completed: 0, total: 8 },
    };

    const result = generateCareInsight(stats, [diabetesInstance], 1);

    expect(result).not.toBeNull();
    expect(result!.title).toBe('Hydration check');
    expect(result!.message).toContain('Metformin');
    expect(result!.message).toContain('hydration');
    expect(result!.type).toBe('dependency');
  });

  it('does NOT fire when water.completed > 0', () => {
    const stats: TodayStats = {
      meds: { completed: 1, total: 2 },
      vitals: { completed: 0, total: 0 },
      meals: { completed: 0, total: 3 },
      water: { completed: 3, total: 8 },
    };

    const result = generateCareInsight(stats, [diabetesInstance], 1);

    // Should be null or a different insight — NOT the hydration one.
    if (result !== null) {
      expect(result.title).not.toBe('Hydration check');
    }
  });
});
