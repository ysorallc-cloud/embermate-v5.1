// ============================================================================
// generatePlainLanguageSummary — Tests
// ============================================================================

jest.mock('expo-store-review', () => ({}));
jest.mock('expo-linking', () => ({}));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { generatePlainLanguageSummary, UnderstandPageData, TimeRange } from '../../utils/understandInsights';

function makeData(overrides: Partial<UnderstandPageData> = {}): UnderstandPageData {
  return {
    timeRange: 7,
    framing: { label: '7 days', description: 'Last week' },
    standOutInsights: [],
    positiveObservations: [],
    correlationCards: [],
    hasEnoughData: true,
    daysOfData: 10,
    adherenceRate: 85,
    dosesLogged: 17,
    dosesScheduled: 20,
    avgMealsPerDay: 2.5,
    avgHydrationPerDay: 6,
    avgSleepHours: 7.2,
    avgWellnessPerDay: 1,
    lunchSkipRate: 0.2,
    ...overrides,
  } as UnderstandPageData;
}

describe('generatePlainLanguageSummary', () => {
  it('returns empty string when daysOfData < 7', () => {
    const result = generatePlainLanguageSummary(makeData({ daysOfData: 3 }), 7);
    expect(result).toBe('');
  });

  it('returns non-empty paragraph when daysOfData >= 7', () => {
    const result = generatePlainLanguageSummary(makeData(), 7);
    expect(result.length).toBeGreaterThan(20);
  });

  it('mentions medication adherence if med data exists', () => {
    const result = generatePlainLanguageSummary(makeData({ adherenceRate: 85, dosesScheduled: 20 }), 7);
    expect(result).toContain('adherence');
    expect(result).toContain('85%');
  });

  it('mentions vital trends if vital-related data exists (sleep)', () => {
    const result = generatePlainLanguageSummary(makeData({ avgSleepHours: 6.2 }), 7);
    expect(result).toContain('Sleep');
    expect(result).toContain('6.2');
  });

  it('summary changes when range changes (7d vs 14d vs 30d)', () => {
    const sum7 = generatePlainLanguageSummary(makeData(), 7);
    const sum14 = generatePlainLanguageSummary(makeData(), 14);
    const sum30 = generatePlainLanguageSummary(makeData(), 30);

    expect(sum7).toContain('7 days');
    expect(sum14).toContain('14 days');
    expect(sum30).toContain('30 days');
  });

  it('includes pattern count when standOutInsights exist', () => {
    const result = generatePlainLanguageSummary(makeData({
      standOutInsights: [
        { id: 'i1', text: 'Test', confidence: 'strong', relatedTo: 'record' },
        { id: 'i2', text: 'Test2', confidence: 'emerging', relatedTo: 'record' },
      ] as any[],
    }), 7);
    expect(result).toContain('2 patterns detected');
  });
});
