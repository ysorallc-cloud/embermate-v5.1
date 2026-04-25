// ============================================================================
// nextScheduledTime plumbing — Now tab → NowHeader → NowGreeting
// Asserts: a helper formats the next pending instance's time, and now.tsx
// wires it into <NowHeader> instead of always passing null.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const nowSrc = readFileSync(
  join(__dirname, '../../app/(tabs)/now.tsx'),
  'utf8',
);

describe('formatNextScheduledTime helper', () => {
  // Helper is added to utils/nowHelpers.ts in this same change.
  const { formatNextScheduledTime } = require('../../utils/nowHelpers');

  it('returns null for null / undefined / empty input', () => {
    expect(formatNextScheduledTime(null)).toBeNull();
    expect(formatNextScheduledTime(undefined)).toBeNull();
    expect(formatNextScheduledTime('')).toBeNull();
  });

  it('formats HH:MM as a 12-hour string with AM/PM', () => {
    expect(formatNextScheduledTime('08:30')).toBe('8:30 AM');
    expect(formatNextScheduledTime('00:05')).toBe('12:05 AM');
    expect(formatNextScheduledTime('13:00')).toBe('1:00 PM');
    expect(formatNextScheduledTime('23:59')).toBe('11:59 PM');
  });

  it('does not return raw ISO timestamps', () => {
    const out = formatNextScheduledTime('2026-04-25T14:30:00');
    expect(out).not.toBeNull();
    // Output should be a 12-hour clock form (must contain AM or PM,
    // must not contain "T" or seconds-precision like ":00:00").
    expect(out).toMatch(/(AM|PM)$/);
    expect(out).not.toContain('T');
    expect(out).not.toContain(':00:00');
  });

  it('returns null for unparseable input', () => {
    expect(formatNextScheduledTime('not a time')).toBeNull();
    expect(formatNextScheduledTime('25:99')).toBeNull();
  });
});

describe('now.tsx wires nextScheduledTime into <NowHeader>', () => {
  it('imports the formatter from nowHelpers', () => {
    expect(nowSrc).toMatch(/formatNextScheduledTime/);
  });

  it('passes a nextScheduledTime prop to <NowHeader>', () => {
    // Look for the prop on the NowHeader element. It should be an expression,
    // not a hard-coded null literal.
    const nowHeaderBlock = nowSrc.match(/<NowHeader[\s\S]*?\/>/);
    expect(nowHeaderBlock).toBeTruthy();
    expect(nowHeaderBlock![0]).toMatch(/nextScheduledTime=\{/);
    expect(nowHeaderBlock![0]).not.toMatch(/nextScheduledTime=\{null\}/);
  });

  it('derives the value from a pending/upcoming instance, not a constant', () => {
    // Some expression that walks the timeline / uses upcoming or nextUp must
    // exist, and feed into formatNextScheduledTime.
    expect(nowSrc).toMatch(/formatNextScheduledTime\(/);
    // Heuristic: the formatter call references either upcoming or nextUp or a
    // pending filter — proving the source of truth is the timeline data.
    expect(nowSrc).toMatch(/upcoming|nextUp|status\s*===?\s*['"]pending['"]/);
  });

  it('falls back to null when no upcoming pending instances exist', () => {
    // The wiring should produce a null when the source array is empty —
    // either via optional chaining (`?.`), a ternary, or a `|| null`.
    const block = nowSrc.match(/nextScheduledTime[\s\S]{0,400}/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/\?\.[a-zA-Z]|:\s*null|\|\|\s*null/);
  });
});
