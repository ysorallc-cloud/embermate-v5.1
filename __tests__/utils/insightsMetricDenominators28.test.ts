// ============================================================================
// Phase 28 Batch B MEALS Commit B — metric denominators + gestalt signal floors.
//
// Pre-fix `avgMealsPerDay` / `avgHydrationPerDay` / `avgWellnessPerDay`
// divided by `*Days.length` (days with ≥1 log of that category) — a
// conditional denominator that turned sparse-logging real data into
// hallucinated high averages ("1 meal logged = Meals 1.0 /day across
// the period"). The audit (project_pre_launch_qa_items "MEALS finding")
// surfaced this as both a sample-data hallucination AND a real-data
// misleading-alarm bug.
//
// Per Commit B Lock 1:
//   • Meals / Hydration / Wellness → range-denominator (α). Event
//     counts; zero-days are real zeros.
//   • Sleep → KEEP sleepDays.length denominator (β special-case).
//     Sleep is a duration reading, not an event count. Range-
//     denominator math would dilute 7 healthy 7hr nights to 3.5hr
//     average — worse than the original bug. Honest "average on
//     tracked nights"; the 4hr gestalt floor (Lock 3) gates whether
//     sparse-night noise headlines the card.
//
// Adherence is NOT affected by the conditional-denominator pattern —
// its formula (handled / logs.length) is already range-based across
// the full log set. This test file includes a positive-assertion pin
// defending against a future refactor accidentally folding adherence
// into the same conditional pattern.
//
// Gestalt floors (Lock 2 + Lock 3):
//   • Meals: >= 1.5 (sparse-logging noise below; sentence omitted)
//   • Sleep: >= 4 hours (sparse-tracking noise below)
//   • Hydration: >= 4 glasses (punitive headline at low values)
//   • Medication adherence: unchanged trigger (dosesScheduled > 0)
//   • Patterns: unchanged (length >= 1)
//
// Floor behavior: below the floor, the sentence is OMITTED from the
// priority list — it doesn't become sentences[0] (the gestalt opener)
// and doesn't appear in the full paragraph. The tile in THE READ
// (InsightsReadCard) still displays the actual number — floors govern
// what HEADLINES the gestalt, not whether the data shows.
// ============================================================================

jest.mock('expo-store-review', () => ({}));
jest.mock('expo-linking', () => ({}));
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  generatePlainLanguageSummary,
  generateOneLineGestalt,
  UnderstandPageData,
} from '../../utils/understandInsights';

function makeData(overrides: Partial<UnderstandPageData> = {}): UnderstandPageData {
  return {
    timeRange: 14,
    framing: { label: '14 days', description: 'Last 2 weeks' },
    standOutInsights: [],
    positiveObservations: [],
    correlationCards: [],
    hasEnoughData: true,
    daysOfData: 14,
    adherenceRate: 0,
    dosesLogged: 0,
    dosesScheduled: 0,
    avgMealsPerDay: 0,
    avgHydrationPerDay: 0,
    avgSleepHours: 0,
    avgWellnessPerDay: 0,
    lunchSkipRate: 0,
    ...overrides,
  } as UnderstandPageData;
}

// ----------------------------------------------------------------------------
// Source-level pins: denominator shape in getCarePlanStatsForRange
// ----------------------------------------------------------------------------

describe('Phase 28 Batch B MEALS Commit B — metric denominators', () => {
  const SRC = readFileSync(
    join(__dirname, '../..', 'utils/understandInsights.ts'),
    'utf8',
  );

  it('avgMealsPerDay divides by timeRange (range-denominator α)', () => {
    // Wave-1 Fix #3: the range-denominator (α) convention is PRESERVED — still
    // `/ timeRange`. Only the numerator changed: meals now come from the
    // canonical INSTANCE unit (mealsCanon.logged), not the LogEntry-derived
    // mealDays sum (which produced the 4.4/day overcount).
    expect(SRC).toMatch(
      /avgMealsPerDay:\s*timeRange\s*>\s*0\s*\?\s*mealsCanon\.logged\s*\/\s*timeRange\s*:\s*0/,
    );
  });

  it('avgHydrationPerDay divides by timeRange (range-denominator α)', () => {
    expect(SRC).toMatch(
      /avgHydrationPerDay:\s*timeRange\s*>\s*0\s*\?\s*hydrationDays\.reduce\([\s\S]+?\)\s*\/\s*timeRange\s*:\s*0/,
    );
  });

  it('avgWellnessPerDay divides by timeRange (range-denominator α)', () => {
    expect(SRC).toMatch(
      /avgWellnessPerDay:\s*timeRange\s*>\s*0\s*\?\s*wellnessDays\.reduce\([\s\S]+?\)\s*\/\s*timeRange\s*:\s*0/,
    );
  });

  it('avgSleepHours keeps sleepDays.length denominator (β special-case for duration)', () => {
    // Sleep is a per-night duration reading, not an event count.
    // Range-denominator would dilute healthy tracked nights to half
    // their actual hours. Lock 1 locked sleep to keep tracked-nights
    // denominator + gate the headline with the 4hr gestalt floor.
    expect(SRC).toMatch(
      /avgSleepHours:\s*sleepDays\.length\s*>\s*0\s*\?\s*sleepDays\.reduce\([\s\S]+?\)\s*\/\s*sleepDays\.length\s*:\s*0/,
    );
  });

  it('adherenceRate stays range-based (handled / logs.length) — defensive against future refactor folding it into the conditional pattern', () => {
    // Adherence's denominator is logs.length (TOTAL care plan logs
    // across the range). Numerator is completedCount + skippedCount,
    // also accumulated across the range. Both scale with timeRange
    // implicitly via the log set — NOT susceptible to the
    // conditional-denominator bug the meal-family metrics had.
    expect(SRC).toMatch(/const\s+handled\s*=\s*completedCount\s*\+\s*skippedCount/);
    expect(SRC).toMatch(
      /const\s+adherenceRate\s*=\s*logs\.length\s*>\s*0\s*\?\s*\(handled\s*\/\s*logs\.length\)\s*\*\s*100\s*:\s*0/,
    );
  });
});

// ----------------------------------------------------------------------------
// Behavioral pins: gestalt signal floors
// ----------------------------------------------------------------------------

describe('Phase 28 Batch B MEALS Commit B — gestalt signal floors', () => {
  describe('Meals floor (>= 1.5)', () => {
    it('omits the meals sentence when avgMealsPerDay < 1.5 (e.g., 1.0)', () => {
      const summary = generatePlainLanguageSummary(makeData({ avgMealsPerDay: 1.0 }), 14);
      expect(summary).not.toContain('meals per day');
    });

    it('omits the meals sentence at the boundary just under the floor (1.4)', () => {
      const summary = generatePlainLanguageSummary(makeData({ avgMealsPerDay: 1.4 }), 14);
      expect(summary).not.toContain('meals per day');
    });

    it('emits the meals sentence at the floor (1.5)', () => {
      const summary = generatePlainLanguageSummary(makeData({ avgMealsPerDay: 1.5 }), 14);
      expect(summary).toContain('1.5 meals per day');
    });

    it('emits the meals sentence at typical sample-data rate (~2.7)', () => {
      const summary = generatePlainLanguageSummary(makeData({ avgMealsPerDay: 2.7 }), 14);
      expect(summary).toContain('2.7 meals per day');
    });
  });

  describe('Sleep floor (>= 4 hours)', () => {
    it('omits the sleep sentence when avgSleepHours < 4 (sparse-tracking noise)', () => {
      const summary = generatePlainLanguageSummary(makeData({ avgSleepHours: 3.5 }), 14);
      expect(summary).not.toContain('Sleep');
    });

    it('emits the "below recommended" sentence in the [4, 7) range', () => {
      const summary = generatePlainLanguageSummary(makeData({ avgSleepHours: 6.2 }), 14);
      expect(summary).toContain('Sleep averaging 6.2 hours');
      expect(summary).toContain('below the recommended 7 hours');
    });

    it('emits the "adequate" sentence at >= 7 hours', () => {
      const summary = generatePlainLanguageSummary(makeData({ avgSleepHours: 7.5 }), 14);
      expect(summary).toContain('Sleep has been adequate');
      expect(summary).toContain('7.5 hours');
    });
  });

  describe('Hydration floor (>= 4 glasses)', () => {
    it('omits the hydration sentence when avgHydrationPerDay < 4', () => {
      const summary = generatePlainLanguageSummary(makeData({ avgHydrationPerDay: 2.5 }), 14);
      expect(summary).not.toContain('Hydration');
      expect(summary).not.toContain('glasses');
    });

    it('emits the hydration sentence at the floor (4)', () => {
      const summary = generatePlainLanguageSummary(makeData({ avgHydrationPerDay: 4 }), 14);
      expect(summary).toContain('Hydration averages 4.0 glasses');
    });
  });

  describe('Medication adherence — no floor (existing trigger preserved)', () => {
    it('emits the adherence sentence whenever dosesScheduled > 0', () => {
      const summary = generatePlainLanguageSummary(
        makeData({ adherenceRate: 85, dosesScheduled: 20 }),
        14,
      );
      expect(summary).toContain('adherence');
      expect(summary).toContain('85%');
    });
  });
});

// ----------------------------------------------------------------------------
// Gestalt opener (sentences[0]) — floor governs the headline
// ----------------------------------------------------------------------------

describe('Phase 28 Batch B MEALS Commit B — gestalt opener sentence priority', () => {
  it('low-data state with only sub-floor meals does not lead with a noise-level meals sentence', () => {
    // Fresh-onboarding general-wellness template scenario: meds
    // disabled (dosesScheduled = 0), only meals seeded sparsely.
    // Pre-fix the opener was "Averaging 1.0 meals per day." Post-
    // fix the meals sentence is below the 1.5 floor and omitted;
    // gestalt returns '' (no other signal above-floor in this state).
    const gestalt = generateOneLineGestalt(
      makeData({ daysOfData: 7, avgMealsPerDay: 1.0, dosesScheduled: 0 }),
      7,
    );
    expect(gestalt).not.toContain('meals per day');
  });

  it('sample-data state with seeded meals at ~2.7/day leads with the meals sentence when meds are disabled', () => {
    const gestalt = generateOneLineGestalt(
      makeData({ daysOfData: 14, avgMealsPerDay: 2.7, dosesScheduled: 0 }),
      14,
    );
    expect(gestalt).toContain('2.7 meals per day');
  });

  it('medication adherence always wins the opener when meds are enabled and dosed', () => {
    const gestalt = generateOneLineGestalt(
      makeData({
        daysOfData: 14,
        adherenceRate: 92,
        dosesScheduled: 30,
        avgMealsPerDay: 2.7,
      }),
      14,
    );
    expect(gestalt).toContain('adherence');
    expect(gestalt).not.toContain('meals per day');
  });
});
