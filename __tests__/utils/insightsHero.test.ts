// ============================================================================
// insightsHero — readiness gate + read-line + pre-data copy.
//
// Pins the empty-ring DECISION: no 0%/grey ring on fresh install. The ring
// gates on daysLogged >= MIN_DAYS_FOR_RING AND total > 0 (the div-by-zero
// guard). Below → "PATTERNS COMING". The read-line stays factual.
// ============================================================================

import {
  MIN_DAYS_FOR_RING,
  getRingReadiness,
  buildAdherenceRead,
  ringWindowLabel,
  patternsComingCopy,
} from '../../utils/insightsHero';

describe('getRingReadiness — the empty-ring gate', () => {
  it('NOT ready on a fresh install (no doses, no days) — prevents the 0% ring', () => {
    const r = getRingReadiness({ daysLogged: 0 }, { total: 0 });
    expect(r.ready).toBe(false);
    expect(r.daysRemaining).toBe(MIN_DAYS_FOR_RING);
  });

  it('NOT ready when doses exist but history is too thin (< threshold days)', () => {
    expect(getRingReadiness({ daysLogged: 3 }, { total: 20 }).ready).toBe(false);
  });

  it('NOT ready when enough days logged but total is 0 (guards the 0/0 → 0%)', () => {
    expect(getRingReadiness({ daysLogged: 14 }, { total: 0 }).ready).toBe(false);
  });

  it('READY once daysLogged >= threshold AND there are doses', () => {
    const r = getRingReadiness({ daysLogged: MIN_DAYS_FOR_RING }, { total: 10 });
    expect(r.ready).toBe(true);
    expect(r.daysRemaining).toBe(0);
  });

  it('tolerates null/undefined coverage or adherence', () => {
    expect(getRingReadiness(null, null).ready).toBe(false);
    expect(getRingReadiness(undefined, undefined).ready).toBe(false);
  });
});

describe('buildAdherenceRead — factual, coral missed count', () => {
  it('all doses logged → single neutral segment, no coral', () => {
    const segs = buildAdherenceRead({ rate: 100, taken: 40, total: 40, windowDays: 14 });
    expect(segs).toHaveLength(1);
    expect(segs[0].tone).toBe('neutral');
    expect(segs[0].text).toContain('Every dose logged');
    expect(segs[0].text).toContain('14 days');
  });

  it('missed doses → the count is a coral segment', () => {
    const segs = buildAdherenceRead({ rate: 92, taken: 37, total: 40, windowDays: 14 });
    const coral = segs.find((s) => s.tone === 'coral');
    expect(coral).toBeDefined();
    expect(coral!.text).toBe('3 doses missed');
    // High rate → gentle lead frame.
    expect(segs[0].text).toContain('Holding steady');
    expect(segs.map((s) => s.text).join('')).toContain('across the last 14 days');
  });

  it('singular dose wording + no lead frame at lower rates', () => {
    const segs = buildAdherenceRead({ rate: 70, taken: 6, total: 7, windowDays: 7 });
    expect(segs.find((s) => s.tone === 'coral')!.text).toBe('1 dose missed');
    expect(segs[0].text).not.toContain('Holding steady');
  });
});

describe('ringWindowLabel + patternsComingCopy', () => {
  it('window label reflects the range', () => {
    expect(ringWindowLabel(14)).toBe('PAST 14 DAYS');
    expect(ringWindowLabel(30)).toBe('PAST 30 DAYS');
  });

  it('pre-data copy counts logged days toward the threshold', () => {
    const c = patternsComingCopy(getRingReadiness({ daysLogged: 2 }, { total: 5 }));
    expect(c.headline).toBe('PATTERNS COMING');
    expect(c.progressLabel).toBe(`2 of ${MIN_DAYS_FOR_RING} days logged`);
    expect(c.sub).toContain(`${MIN_DAYS_FOR_RING - 2} more days`);
    expect(c.fraction).toBeCloseTo(2 / MIN_DAYS_FOR_RING, 5);
  });
});
