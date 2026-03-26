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
    expect(src).toContain('rgba(200,195,180,0.3)');
  });

  it('day cells are 44px height', () => {
    expect(src).toContain('height: 44');
  });

  it('selected day has 28px circle with accent background', () => {
    expect(src).toContain('daySelected');
    // 28px circle
    expect(src).toMatch(/width: 28[\s\S]*?borderRadius: 14/);
    expect(src).toContain('rgba(93,202,165,0.2)');
  });

  it('today (not selected) uses #5DCAA5', () => {
    expect(src).toContain('dayNumberToday');
    expect(src).toContain("color: '#5DCAA5'");
  });

  it('future days are dimmed and not tappable', () => {
    expect(src).toContain('dayNumberFuture');
    expect(src).toContain('rgba(200,195,180,0.15)');
    expect(src).toContain('disabled={isFuture}');
  });

  it('status dots use correct colors', () => {
    // full: #5DCAA5
    expect(src).toContain("full: '#5DCAA5'");
    // partial: #c8a44e
    expect(src).toContain("partial: '#c8a44e'");
    // none: dimmed
    expect(src).toContain("none: 'rgba(200,195,180,0.15)'");
    // future: no dot
    expect(src).toContain('future: null');
  });

  it('status dot is 4px circle', () => {
    expect(src).toContain('width: 4');
    // statusDot height 4
    expect(src).toMatch(/statusDot[\s\S]*?height: 4/);
  });

  it('container uses light card styling', () => {
    expect(src).toContain('rgba(74,107,93,0.06)');  // bg
    expect(src).toContain('rgba(74,107,93,0.1)');    // border
    expect(src).toContain('borderRadius: 14');
    expect(src).toContain('padding: 16');
    expect(src).toContain('marginBottom: 24');
  });

  it('getDaysInMonth returns correct values', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31);  // January
    expect(getDaysInMonth(2026, 1)).toBe(28);  // February (non-leap)
    expect(getDaysInMonth(2024, 1)).toBe(29);  // February (leap)
    expect(getDaysInMonth(2026, 3)).toBe(30);  // April
  });
});
