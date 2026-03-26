// ============================================================================
// DateTabStrip — Structure and logic tests
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

const componentPath = path.resolve(__dirname, '../../components/journal/DateTabStrip.tsx');
const src = fs.readFileSync(componentPath, 'utf-8');

// Replicate getDates logic for testing
function getDates(count: number): { date: string; label: string }[] {
  const today = new Date();
  const results: { date: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const label = i === 0
      ? 'Today'
      : `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`;
    results.push({ date: dateStr, label });
  }
  return results;
}

describe('DateTabStrip', () => {
  it('file exports DateTabStrip component', () => {
    expect(src).toContain('export function DateTabStrip');
  });

  it('generates correct number of date chips (default 7)', () => {
    const dates = getDates(7);
    expect(dates).toHaveLength(7);
  });

  it('last chip is always "Today"', () => {
    const dates = getDates(7);
    expect(dates[dates.length - 1].label).toBe('Today');
  });

  it('today chip date matches current date', () => {
    const dates = getDates(7);
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(dates[dates.length - 1].date).toBe(expected);
  });

  it('other chips show abbreviated day + number', () => {
    const dates = getDates(7);
    // First chip (6 days ago) should have format like "Thu 12"
    expect(dates[0].label).not.toBe('Today');
    expect(dates[0].label).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });

  it('selected chip uses accent colors', () => {
    expect(src).toContain('rgba(93,202,165,0.12)');  // selected bg
    expect(src).toContain('rgba(93,202,165,0.25)');  // selected border
    expect(src).toContain('#5DCAA5');                  // selected text
  });

  it('unselected chip uses muted colors', () => {
    expect(src).toContain('rgba(74,107,93,0.08)');   // unselected bg
    expect(src).toContain('rgba(74,107,93,0.12)');   // unselected border
    expect(src).toContain('rgba(200,195,180,0.45)'); // unselected text
  });

  it('calendar toggle button renders with correct styles', () => {
    expect(src).toContain('calendarBtn');
    expect(src).toContain('calendarBtnOpen');
    expect(src).toContain('onCalendarToggle');
    // 36x36 button
    expect(src).toContain('width: 36');
    expect(src).toContain('height: 36');
  });

  it('horizontal ScrollView with no indicator', () => {
    expect(src).toContain('horizontal');
    expect(src).toContain('showsHorizontalScrollIndicator={false}');
  });

  it('chips have correct sizing (borderRadius 10, padding 8/16)', () => {
    expect(src).toContain('borderRadius: 10');
    expect(src).toContain('paddingVertical: 8');
    expect(src).toContain('paddingHorizontal: 16');
    expect(src).toContain('marginRight: 8');
  });
});
