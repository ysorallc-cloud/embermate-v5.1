// ============================================================================
// classifyInsightsState — Phase 3.7.3 unit contract.
// ============================================================================

import {
  classifyInsightsState,
  gatingForState,
  POPULATED_DAYS_THRESHOLD,
} from '../../utils/insightsState';

describe('classifyInsightsState — three discrete states', () => {
  it('returns "empty" when loggedEventCount is 0 (regardless of days)', () => {
    expect(classifyInsightsState(0, 0)).toBe('empty');
    expect(classifyInsightsState(13, 0)).toBe('empty');
    expect(classifyInsightsState(20, 0)).toBe('empty');
  });

  it('returns "building" with events but daysOfData < 14', () => {
    expect(classifyInsightsState(1, 5)).toBe('building');
    expect(classifyInsightsState(7, 50)).toBe('building');
    expect(classifyInsightsState(13, 199)).toBe('building');
  });

  it('returns "populated" at exactly 14 days with events', () => {
    expect(classifyInsightsState(14, 1)).toBe('populated');
    expect(classifyInsightsState(14, 200)).toBe('populated');
    expect(classifyInsightsState(60, 999)).toBe('populated');
  });

  it('POPULATED_DAYS_THRESHOLD is 14 (the spec\'s threshold)', () => {
    expect(POPULATED_DAYS_THRESHOLD).toBe(14);
  });
});

describe('gatingForState — per-section render rules per spec table', () => {
  describe('empty state', () => {
    const g = gatingForState('empty', 0);
    it('shows Patterns Coming + tip card; hides reports / patterns / adherence', () => {
      expect(g.showPatternsComing).toBe(true);
      expect(g.showTipCard).toBe(true);
      expect(g.showPatternCards).toBe(false);
      expect(g.showReports).toBe(false);
      expect(g.showAdherenceChart).toBe(false);
    });
  });

  describe('building state', () => {
    const g = gatingForState('building', 1);
    it('shows Patterns Coming; hides tip card, reports, patterns, adherence', () => {
      expect(g.showPatternsComing).toBe(true);
      expect(g.showTipCard).toBe(false);
      expect(g.showPatternCards).toBe(false);
      expect(g.showReports).toBe(false);
      expect(g.showAdherenceChart).toBe(false);
    });
  });

  describe('populated state', () => {
    const g = gatingForState('populated', 14);
    it('shows pattern cards + reports + adherence; hides Patterns Coming / tip', () => {
      expect(g.showPatternsComing).toBe(false);
      expect(g.showTipCard).toBe(false);
      expect(g.showPatternCards).toBe(true);
      expect(g.showReports).toBe(true);
      expect(g.showAdherenceChart).toBe(true);
    });
  });

  describe('adherence chart hard floor — daysOfData >= 14', () => {
    it('NEVER renders adherence chart when daysOfData < 14, in any state', () => {
      // Defense-in-depth: even if a future classifier change were to label
      // a < 14-day window as "populated," the gating function clamps
      // adherence chart visibility independently.
      for (let days = 0; days < 14; days += 1) {
        for (const state of ['empty', 'building', 'populated'] as const) {
          const g = gatingForState(state, days);
          expect(g.showAdherenceChart).toBe(false);
        }
      }
    });

    it('renders adherence chart when daysOfData >= 14 AND state is populated', () => {
      expect(gatingForState('populated', 14).showAdherenceChart).toBe(true);
      expect(gatingForState('populated', 30).showAdherenceChart).toBe(true);
    });

    it('hides adherence chart at >= 14 days when state is empty (no events ever)', () => {
      // The empty-state classification can occur even at high day counts
      // if loggedEventCount is 0 (user has had the app for weeks but
      // hasn't logged anything). Adherence chart stays hidden.
      expect(gatingForState('empty', 30).showAdherenceChart).toBe(false);
    });
  });
});

describe('Spec scenario fixtures', () => {
  it('day 0 / 0 events → empty: no reports, no adherence, no patterns', () => {
    const state = classifyInsightsState(0, 0);
    const g = gatingForState(state, 0);
    expect(g.showReports).toBe(false);
    expect(g.showAdherenceChart).toBe(false);
    expect(g.showPatternCards).toBe(false);
  });

  it('day 1 / 5 events → building: Patterns Coming visible, no chart, no reports', () => {
    const state = classifyInsightsState(1, 5);
    const g = gatingForState(state, 1);
    expect(g.showPatternsComing).toBe(true);
    expect(g.showAdherenceChart).toBe(false);
    expect(g.showReports).toBe(false);
    expect(g.showPatternCards).toBe(false);
  });

  it('day 14 / 200 events → populated: reports + adherence + patterns', () => {
    const state = classifyInsightsState(14, 200);
    const g = gatingForState(state, 14);
    expect(g.showPatternsComing).toBe(false);
    expect(g.showReports).toBe(true);
    expect(g.showAdherenceChart).toBe(true);
    expect(g.showPatternCards).toBe(true);
  });
});
