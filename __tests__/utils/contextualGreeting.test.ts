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

describe('buildGreeting — contextual rule-based greeting', () => {
  // Morning (6–11)
  it('morning: title is "Good morning"', () => {
    const g = buildGreeting(8, baseStats, '8:30 AM', 'Mom');
    expect(g.title).toBe('Good morning');
  });

  it('morning: subtitle references next scheduled time + patient name', () => {
    const g = buildGreeting(7, baseStats, '8:30 AM', 'Mom');
    expect(g.subtitle).toContain('Mom');
    expect(g.subtitle).toContain('8:30 AM');
  });

  // Midday (12–17)
  it('midday: title is "Good afternoon" when no caregiver name', () => {
    const g = buildGreeting(14, baseStats, null, 'Mom');
    expect(g.title).toBe('Good afternoon');
  });

  it('midday with morning complete: subtitle acknowledges completion', () => {
    const g = buildGreeting(13, doneStats, null, 'Mom');
    expect(g.subtitle).toMatch(/smoothly|done|complete/i);
  });

  // Evening (18–23)
  it('evening with 0 items left: title is "All caught up"', () => {
    const g = buildGreeting(20, doneStats, null, 'Mom');
    expect(g.title).toMatch(/caught up/i);
  });

  it('evening with 1 item left: title is "Almost there"', () => {
    const stats = { ...doneStats, meals: { completed: 2, total: 3 } };
    const g = buildGreeting(19, stats, null, 'Mom');
    expect(g.title).toMatch(/almost there/i);
  });

  it('evening with 2+ items left: title is "Good evening"', () => {
    const g = buildGreeting(20, baseStats, null, 'Mom');
    expect(g.title).toBe('Good evening');
  });

  it('evening: subtitle names what is left', () => {
    const g = buildGreeting(20, baseStats, null, 'Mom');
    expect(g.subtitle).toMatch(/remaining|left|still/i);
  });

  // Late night (0–5)
  it('late night: title is "Late night check-in"', () => {
    const g = buildGreeting(2, baseStats, null, 'Mom');
    expect(g.title).toMatch(/late night/i);
  });

  it('late night: subtitle is minimal', () => {
    const g = buildGreeting(3, baseStats, null, 'Mom');
    expect(g.subtitle.length).toBeLessThan(60);
  });

  // Return shape
  it('always returns { title, subtitle } strings', () => {
    for (const hour of [0, 6, 12, 18, 23]) {
      const g = buildGreeting(hour, baseStats, null, 'Mom');
      expect(typeof g.title).toBe('string');
      expect(typeof g.subtitle).toBe('string');
      expect(g.title.length).toBeGreaterThan(0);
    }
  });
});
