// ============================================================================
// MonthCalendar — Structure, logic, and style tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const componentPath = path.resolve(__dirname, '../../components/journal/MonthCalendar.tsx');
const src = fs.readFileSync(componentPath, 'utf-8');

// Replicate helpers for testing
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

describe('MonthCalendar', () => {
  it('file exports MonthCalendar and DayStatus', () => {
    expect(src).toContain('export function MonthCalendar');
    expect(src).toContain('export interface DayStatus');
  });

  it('returns null when visible is false', () => {
    expect(src).toContain('if (!visible) return null');
  });

  it('uses LayoutAnimation for smooth expand', () => {
    expect(src).toContain('LayoutAnimation.configureNext');
    expect(src).toContain('LayoutAnimation.Presets.easeInEaseOut');
  });

  it('month header has left/right arrows and month label', () => {
    expect(src).toContain('Previous month');
    expect(src).toContain('Next month');
    expect(src).toContain('monthLabel');
    // Arrow tap targets are 28px
    expect(src).toContain('width: 28');
    expect(src).toContain('height: 28');
  });

  it('cannot navigate past the current month', () => {
    expect(src).toContain('canGoForward');
    expect(src).toContain('disabled={!canGoForward}');
  });

  it('day-of-week header shows S M T W T F S', () => {
    expect(src).toContain("['S', 'M', 'T', 'W', 'T', 'F', 'S']");
    expect(src).toContain('fontSize: 11');
    // Phase 17B: dowLabel color is now `c.textWarmHint` (warm-token).
    expect(src).toMatch(/dowLabel:[\s\S]*?color:\s*c\.textWarmHint/);
  });

  it('day cells are 44px height', () => {
    expect(src).toContain('height: 44');
  });

  it('selected day has 28px circle with accent background', () => {
    expect(src).toContain('daySelected');
    // 28px circle
    expect(src).toMatch(/width: 28[\s\S]*?borderRadius: 14/);
    // Phase 17B: selected day background is now `c.accentLight` (warm-token).
    expect(src).toMatch(/daySelected:[\s\S]*?backgroundColor:\s*c\.accentLight/);
  });

  it('today (not selected) uses the accent token', () => {
    expect(src).toContain('dayNumberToday');
    // Phase 17B: was hardcoded #5DCAA5 → now `c.accent`.
    expect(src).toMatch(/dayNumberToday:[\s\S]*?color:\s*c\.accent/);
  });

  it('future days are dimmed and not tappable', () => {
    expect(src).toContain('dayNumberFuture');
    // Phase 17B: was hardcoded rgba → now `c.textWarmDim`.
    expect(src).toMatch(/dayNumberFuture:[\s\S]*?color:\s*c\.textWarmDim/);
    expect(src).toContain('disabled={isFuture}');
  });

  it('status dots use theme-token colors', () => {
    // Phase 17B: DOT_COLORS constant → buildDotColors(c) factory using
    // accent (full), amberBright (partial), warmSurfaceBorder (none),
    // and null for future.
    expect(src).toContain('buildDotColors');
    expect(src).toMatch(/full:\s*c\.accent/);
    expect(src).toMatch(/partial:\s*c\.amberBright/);
    expect(src).toMatch(/none:\s*c\.warmSurfaceBorder/);
    expect(src).toContain('future: null');
  });

  it('status dot is 4px circle', () => {
    expect(src).toContain('width: 4');
    // statusDot height 4
    expect(src).toMatch(/statusDot[\s\S]*?height: 4/);
  });

  it('container uses warm-surface theme tokens', () => {
    // Phase 17B: was hardcoded sage RGBA → now `c.warmSurface` /
    // `c.warmSurfaceBorder` from the warm-token system. Reads from theme
    // via createStyles(c) factory and useTheme().
    expect(src).toMatch(/container:[\s\S]*?backgroundColor:\s*c\.warmSurface/);
    expect(src).toMatch(/container:[\s\S]*?borderColor:\s*c\.warmSurfaceBorder/);
    expect(src).toContain('borderRadius: 14');
    // May 1 spacing-rhythm Phase 2: card padding lifted to canonical 12pt.
    expect(src).toContain('padding: 12');
    // Phase 3.7.1 migrated literal `marginBottom: 24` → `Spacing.lg` so
    // the Phase 3.5 cascade (lg = 28) reaches this card.
    expect(src).toMatch(/marginBottom:\s*Spacing\.lg\b/);
    // Component must consume the active palette via useTheme + factory.
    expect(src).toContain("import { useTheme }");
    expect(src).toContain('createStyles(colors)');
  });

  it('getDaysInMonth returns correct values', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31);  // January
    expect(getDaysInMonth(2026, 1)).toBe(28);  // February (non-leap)
    expect(getDaysInMonth(2024, 1)).toBe(29);  // February (leap)
    expect(getDaysInMonth(2026, 3)).toBe(30);  // April
  });
});
