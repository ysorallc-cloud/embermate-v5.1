// ============================================================================
// Schedule period headers — Phase 3.8.2 palette + copy.
//
// Pre-3.8.2:
//   • past-incomplete + current-active periods rendered in colors.warning
//     (amber #e5b04a) — outside the Phase 7 3-accent budget.
//   • past-incomplete copy read "N not logged" — deficit-framed,
//     inconsistent with the warm tone elsewhere in the app.
//
// 3.8.2 fix:
//   • Color: warning → textSecondary (past-incomplete) and accent
//     (current-active). Active period draws the eye via sage; past-
//     incomplete reads quiet warm cream rather than alarming amber.
//   • Copy: "N not logged" → "N to go" (forward-looking, matches the
//     existing "current-active" copy).
//   • "complete" / "caught up" stays on sage.
//
// Source-level test pins both the helper output and the component
// color-mapping, plus a guard against amber-family hex re-leaking
// into either file.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { getPeriodStatus } from '../../utils/scheduleStatus';

const ROOT = join(__dirname, '../..');
const headerSrc = readFileSync(
  join(ROOT, 'components/now/SchedulePeriodHeader.tsx'),
  'utf8',
);
const cardSrc = readFileSync(
  join(ROOT, 'components/now/ScheduleCard.tsx'),
  'utf8',
);
const statusSrc = readFileSync(join(ROOT, 'utils/scheduleStatus.ts'), 'utf8');

describe('Phase 3.8.2 — period header copy reframed to "to go"', () => {
  it('past-incomplete with 4 events unlogged reads "4 to go"', () => {
    const events = Array.from({ length: 4 }).map(() => ({
      status: 'pending' as const,
    }));
    // Force a past period — morning, evaluated at 14:00.
    const status = getPeriodStatus('morning', events as any, new Date(2026, 4, 3, 14, 0));
    expect(status.kind).toBe('past-incomplete');
    expect(status.label).toBe('4 to go');
  });

  it('past-incomplete with 1 event unlogged reads "1 to go"', () => {
    const events = [{ status: 'pending' as const }];
    const status = getPeriodStatus('morning', events as any, new Date(2026, 4, 3, 14, 0));
    expect(status.label).toBe('1 to go');
  });

  it('past-complete still reads "complete" (existing contract)', () => {
    const events = [{ status: 'completed' as const }, { status: 'completed' as const }];
    const status = getPeriodStatus('morning', events as any, new Date(2026, 4, 3, 14, 0));
    expect(status.kind).toBe('past-complete');
    expect(status.label).toBe('complete');
  });

  it('current-active with N to go preserved (existing contract)', () => {
    const events = Array.from({ length: 2 }).map(() => ({ status: 'pending' as const }));
    const status = getPeriodStatus('afternoon', events as any, new Date(2026, 4, 3, 14, 0));
    expect(status.kind).toBe('current-active');
    expect(status.label).toBe('2 to go');
  });

  it('the deficit-framed "not logged" copy is fully gone from scheduleStatus', () => {
    // Strip line comments so the rationale prose mentioning the retired
    // phrase doesn't trip the negative assertion designed for the actual
    // label strings.
    const code = statusSrc
      .split('\n')
      .map((l) => l.replace(/^\s*\/\/.*$/, ''))
      .join('\n');
    expect(code).not.toMatch(/not logged/);
  });
});

describe('Phase 3.8.2 — period header color mapping', () => {
  it('past-incomplete maps to textSecondary (NOT colors.warning / amber)', () => {
    // The switch-case for status.kind in SchedulePeriodHeader.
    expect(headerSrc).toMatch(
      /case\s*['"]past-incomplete['"]:[\s\S]{0,200}?colors\.textSecondary\b/,
    );
    // Negative — past-incomplete must NOT route to colors.warning.
    expect(headerSrc).not.toMatch(
      /case\s*['"]past-incomplete['"]:[\s\S]{0,80}?colors\.warning\b/,
    );
  });

  it('current-active maps to colors.accent (the canonical "draw-the-eye" state)', () => {
    expect(headerSrc).toMatch(
      /case\s*['"]current-active['"]:[\s\S]{0,200}?colors\.accent\b/,
    );
  });

  it('current-caughtup maps to colors.accent (existing contract preserved)', () => {
    expect(headerSrc).toMatch(
      /case\s*['"]current-caughtup['"]:[\s\S]{0,200}?colors\.accent\b/,
    );
  });

  it('SchedulePeriodHeader does NOT reference colors.warning in active code', () => {
    // Strip line comments so prose mentions ("colors.warning retired")
    // don't trip the negative assertion.
    const code = headerSrc
      .split('\n')
      .map((l) => l.replace(/^\s*\/\/.*$/, ''))
      .join('\n');
    expect(code).not.toMatch(/\bcolors\.warning\b/);
  });
});

describe('Phase 3.8.2 — amber-family color audit', () => {
  // Pin no amber-family hex literals in either schedule file. Any
  // future leakage of #e5b04a / #fbbf24 / #f59e0b / #fde68a would
  // fail this guard.
  const AMBER_RE = /#e5b04a|#fbbf24|#f59e0b|#fde68a|#fcd34d/i;

  it('SchedulePeriodHeader.tsx contains no amber-family hex', () => {
    expect(headerSrc).not.toMatch(AMBER_RE);
  });

  it('ScheduleCard.tsx contains no amber-family hex', () => {
    expect(cardSrc).not.toMatch(AMBER_RE);
  });
});
