import { buildGreeting } from '../../utils/contextualGreeting';
import type { TodayStats } from '../../utils/nowHelpers';

const baseStats: TodayStats = {
  meds: { completed: 0, total: 2 },
  vitals: { completed: 0, total: 1 },
  meals: { completed: 0, total: 3 },
};

const doneStats: TodayStats = {
  meds: { completed: 2, total: 2 },
  vitals: { completed: 1, total: 1 },
  meals: { completed: 3, total: 3 },
};

// "Empty" = nothing scheduled at all (zeros across the required keys)
const emptyStats: TodayStats = {
  meds: { completed: 0, total: 0 },
  vitals: { completed: 0, total: 0 },
  meals: { completed: 0, total: 0 },
};

const halfStats: TodayStats = {
  meds: { completed: 1, total: 2 },
  vitals: { completed: 1, total: 1 },
  meals: { completed: 1, total: 3 },
};

describe('buildGreeting — contextual rule-based greeting', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Morning (6–11)
  // ──────────────────────────────────────────────────────────────────────────
  describe('morning branch (6–11)', () => {
    it('title is "Good morning"', () => {
      const g = buildGreeting(8, baseStats, '8:30 AM', 'Mom');
      expect(g.title).toBe('Good morning');
    });

    it('subtitle references next scheduled time when provided (patient name lives in the pill)', () => {
      const g = buildGreeting(7, baseStats, '8:30 AM', 'Mom');
      expect(g.subtitle).toContain('8:30 AM');
      // Patient name is intentionally omitted from the subtitle in v6.7 —
      // it's already rendered in the header pill above. Repeating it here
      // makes the metadata row wrap on common iPhone widths.
      expect(g.subtitle).not.toContain('Mom');
    });

    it('falls back to total item count when no next scheduled time', () => {
      const g = buildGreeting(9, baseStats, null, 'Mom');
      expect(g.subtitle).toContain('6');
      expect(g.subtitle).toMatch(/schedule/i);
    });

    it('uses care-day-starting copy when there are no items at all', () => {
      const g = buildGreeting(7, emptyStats, null, 'Mom');
      // Subtitle is name-free in v6.7 (see comment above).
      expect(g.subtitle).toMatch(/starting/i);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Midday (12–17)
  // ──────────────────────────────────────────────────────────────────────────
  describe('midday branch (12–17)', () => {
    it('title is "Good afternoon"', () => {
      const g = buildGreeting(14, baseStats, null, 'Mom');
      expect(g.title).toBe('Good afternoon');
    });

    it('with morning complete + no upcoming time: acknowledges completion', () => {
      const g = buildGreeting(13, doneStats, null, 'Mom');
      expect(g.subtitle).toMatch(/Morning's done/);
    });

    it('with morning complete + upcoming afternoon time: "Next meds: [time]"', () => {
      const g = buildGreeting(13, doneStats, '2:00 PM', 'Mom');
      expect(g.subtitle).toBe('Next meds: 2:00 PM');
    });

    it('with morning incomplete + upcoming time: "Next meds: [time]"', () => {
      const g = buildGreeting(14, halfStats, '3:30 PM', 'Mom');
      expect(g.subtitle).toBe('Next meds: 3:30 PM');
    });

    it('with partial progress + no upcoming time: shows X of Y done + remaining', () => {
      const g = buildGreeting(14, halfStats, null, 'Mom');
      expect(g.subtitle).toContain('3'); // done
      expect(g.subtitle).toContain('6'); // total
      expect(g.subtitle).toMatch(/remaining/i);
    });

    it('with nothing done + no upcoming time: subtitle states schedule size', () => {
      const g = buildGreeting(15, baseStats, null, 'Mom');
      expect(g.subtitle).toContain('6');
      expect(g.subtitle).toMatch(/schedule/i);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Evening (18–23)
  // ──────────────────────────────────────────────────────────────────────────
  describe('evening branch (18–23)', () => {
    it('with 0 items left: title is "All caught up"', () => {
      const g = buildGreeting(20, doneStats, null, 'Mom');
      expect(g.title).toMatch(/caught up/i);
    });

    it('with 1 item left: title is "Almost there"', () => {
      const stats = { ...doneStats, meals: { completed: 2, total: 3 } };
      const g = buildGreeting(19, stats, null, 'Mom');
      expect(g.title).toMatch(/almost there/i);
    });

    it('with 2+ items left: title is "Good evening"', () => {
      const g = buildGreeting(20, baseStats, null, 'Mom');
      expect(g.title).toBe('Good evening');
    });

    it('subtitle names what is left', () => {
      const g = buildGreeting(20, baseStats, null, 'Mom');
      expect(g.subtitle).toMatch(/Almost done/);
      expect(g.subtitle).toMatch(/left tonight/);
    });

    it('"All caught up" subtitle reads "All done. Nice work."', () => {
      const g = buildGreeting(22, doneStats, null, 'Mom');
      expect(g.subtitle).toBe('All done. Nice work.');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Late night (0–5)
  // ──────────────────────────────────────────────────────────────────────────
  describe('late-night branch (0–5)', () => {
    it('title is "Late night check-in"', () => {
      const g = buildGreeting(2, baseStats, null, 'Mom');
      expect(g.title).toMatch(/late night/i);
    });

    it('subtitle is minimal', () => {
      const g = buildGreeting(3, baseStats, null, 'Mom');
      expect(g.subtitle.length).toBeLessThan(60);
    });

    it('with everything done: subtitle confirms', () => {
      const g = buildGreeting(1, doneStats, null, 'Mom');
      expect(g.subtitle).toMatch(/logged/i);
    });

    it('uses singular "item" when exactly 1 remains', () => {
      const stats = { ...doneStats, meals: { completed: 2, total: 3 } };
      const g = buildGreeting(4, stats, null, 'Mom');
      expect(g.subtitle).toContain('1 item');
      expect(g.subtitle).not.toContain('1 items');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // HOUR BOUNDARIES — exact transitions between branches
  // ──────────────────────────────────────────────────────────────────────────
  describe('hour boundaries — exact branch transitions', () => {
    it('hour 0 falls into late-night branch', () => {
      const g = buildGreeting(0, baseStats, null, 'Mom');
      expect(g.title).toMatch(/late night/i);
    });

    it('hour 5 is the last late-night hour', () => {
      const g = buildGreeting(5, baseStats, null, 'Mom');
      expect(g.title).toMatch(/late night/i);
    });

    it('hour 6 is the first morning hour', () => {
      const g = buildGreeting(6, baseStats, null, 'Mom');
      expect(g.title).toBe('Good morning');
    });

    it('hour 11 is the last morning hour', () => {
      const g = buildGreeting(11, baseStats, null, 'Mom');
      expect(g.title).toBe('Good morning');
    });

    it('hour 12 is the first midday hour', () => {
      const g = buildGreeting(12, baseStats, null, 'Mom');
      expect(g.title).toBe('Good afternoon');
    });

    it('hour 17 is the last midday hour', () => {
      const g = buildGreeting(17, baseStats, null, 'Mom');
      expect(g.title).toBe('Good afternoon');
    });

    it('hour 18 is the first evening hour', () => {
      const g = buildGreeting(18, baseStats, null, 'Mom');
      // "Good evening" with 6 items left (>=2)
      expect(g.title).toBe('Good evening');
    });

    it('hour 23 is the last evening hour', () => {
      const g = buildGreeting(23, baseStats, null, 'Mom');
      expect(g.title).toBe('Good evening');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // DST GUARD — buildGreeting takes a raw hour (no Date math), so it must
  // behave identically regardless of system timezone or DST status. This test
  // pins that behavior so a future refactor that introduces Date.getHours()
  // would surface a regression.
  // ──────────────────────────────────────────────────────────────────────────
  describe('DST / timezone guard', () => {
    const originalTZ = process.env.TZ;

    afterAll(() => {
      process.env.TZ = originalTZ;
    });

    it('returns the same greeting at hour=8 across timezones', () => {
      // Spring-forward day (US 2026) and fall-back day (US 2025) shouldn't
      // matter because the function consumes a pre-computed hour. We sample a
      // few zones to make the invariant explicit.
      const tzs = ['UTC', 'America/New_York', 'Asia/Tokyo', 'Pacific/Auckland'];
      const baseline = buildGreeting(8, baseStats, '8:30 AM', 'Mom');
      for (const tz of tzs) {
        process.env.TZ = tz;
        const g = buildGreeting(8, baseStats, '8:30 AM', 'Mom');
        expect(g).toEqual(baseline);
      }
    });

    it('hour=2 on a DST spring-forward day still maps to late-night branch', () => {
      // 02:00 doesn't exist as a wall-clock time on US spring-forward days,
      // but the function only sees the integer 2 — branch must be late-night.
      const g = buildGreeting(2, baseStats, null, 'Mom');
      expect(g.title).toMatch(/late night/i);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Return shape
  // ──────────────────────────────────────────────────────────────────────────
  it('always returns { title, subtitle } strings', () => {
    for (const hour of [0, 6, 12, 18, 23]) {
      const g = buildGreeting(hour, baseStats, null, 'Mom');
      expect(typeof g.title).toBe('string');
      expect(typeof g.subtitle).toBe('string');
      expect(g.title.length).toBeGreaterThan(0);
    }
  });

  it('handles empty stats without throwing in any branch', () => {
    for (const hour of [0, 8, 14, 20]) {
      expect(() => buildGreeting(hour, emptyStats, null, 'Mom')).not.toThrow();
    }
  });
});
