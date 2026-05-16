// ============================================================================
// Phase 28 F2 — generateOneLineGestalt one-sentence opener helper.
//
// Phase 28 Section 1 (THE READ) leads with a one-line gestalt prose opener,
// then surfaces the remaining facts as a metric grid below. The existing
// generatePlainLanguageSummary returns a fused multi-sentence paragraph —
// too long for the opener slot.
//
// Phase 28 D1 / audit step 3 confirmed extracting sentences[0] from the
// existing builder is straightforward (sentences are independent and
// stackable; the first one is always the highest-priority observation
// when present). No new copy; no new phrasing; the helper just exposes
// the first sentence as a separate output.
//
// Pinned contracts:
//   1. Returns '' when daysOfData < 7 (mirrors generatePlainLanguageSummary).
//   2. With adherence data present, returns the adherence sentence as
//      sentences[0] (highest priority).
//   3. Without adherence but with meals data, returns the meals sentence.
//   4. Returns a single sentence — no trailing or leading whitespace,
//      ends with '.'.
//   5. No drift — the one-line output is a verbatim sentence the
//      existing generatePlainLanguageSummary already produces (defense
//      pin: gestalt MUST be a substring of the full summary when both
//      return non-empty).
// ============================================================================

import {
  generateOneLineGestalt,
  generatePlainLanguageSummary,
  type UnderstandPageData,
} from '../../utils/understandInsights';

function makeData(overrides: Partial<UnderstandPageData> = {}): UnderstandPageData {
  return {
    timeRange: 14,
    framing: { label: '', subtitle: '', description: '' },
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
  };
}

describe('Phase 28 F2 — generateOneLineGestalt', () => {
  it('contract 1: returns empty string when daysOfData < 7', () => {
    const data = makeData({ daysOfData: 6, dosesScheduled: 10, adherenceRate: 90 });
    expect(generateOneLineGestalt(data, 14)).toBe('');
  });

  it('contract 2: with adherence data, returns the adherence sentence as the opener', () => {
    const data = makeData({
      daysOfData: 14,
      dosesScheduled: 50,
      adherenceRate: 92,
      avgMealsPerDay: 2.5,
      avgSleepHours: 7.5,
    });
    const opener = generateOneLineGestalt(data, 14);
    expect(opener).toMatch(/adherence/i);
    expect(opener).toMatch(/92%/);
  });

  it('contract 3: without adherence but with meals, returns the meals sentence', () => {
    const data = makeData({
      daysOfData: 14,
      dosesScheduled: 0,    // no meds at all
      avgMealsPerDay: 2.3,
    });
    const opener = generateOneLineGestalt(data, 14);
    expect(opener).toMatch(/2\.3 meals/);
  });

  it('contract 4: returns a single sentence — no padding, ends with period', () => {
    const data = makeData({
      daysOfData: 14,
      dosesScheduled: 50,
      adherenceRate: 92,
      avgMealsPerDay: 2.5,
      avgSleepHours: 7.5,
    });
    const opener = generateOneLineGestalt(data, 14);
    expect(opener).toBe(opener.trim());
    expect(opener.endsWith('.')).toBe(true);
    // Only one terminal period — not a fused multi-sentence string.
    const terminalPeriods = (opener.match(/\.\s+[A-Z]/g) ?? []).length;
    expect(terminalPeriods).toBe(0);
  });

  it('contract 5 (no-drift defense): the opener is a substring of the full summary when both return non-empty', () => {
    const data = makeData({
      daysOfData: 14,
      dosesScheduled: 50,
      adherenceRate: 75,
      avgMealsPerDay: 2.1,
      avgSleepHours: 6.5,
      avgHydrationPerDay: 4.0,
    });
    const opener = generateOneLineGestalt(data, 14);
    const full = generatePlainLanguageSummary(data, 14);
    expect(opener.length).toBeGreaterThan(0);
    expect(full).toContain(opener);
  });

  it('returns empty when no signal is present (zero counters everywhere)', () => {
    // The full summary has a fused-fallback paragraph for this case; the
    // gestalt opener skips the fallback because two-sentence fallback
    // copy is the exact thing the opener slot is meant to avoid.
    const data = makeData({ daysOfData: 14 });
    expect(generateOneLineGestalt(data, 14)).toBe('');
  });
});
