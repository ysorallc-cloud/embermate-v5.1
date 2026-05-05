// Phase 5.9.e — HandoffSheet always receives today's dateKey.
//
// The Journal tab might be viewing a past day (selectedDate = '2026-05-03')
// but the HandoffSheet must always key to today so the tone repo and
// canonical builder agree on which day's data they're operating on.

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Phase 5.9.e — HandoffSheet always-today date routing', () => {
  it('HandoffSheet dateKey is getTodayDateString(), not selectedDate', () => {
    // Find the <HandoffSheet ... dateKey={...} /> JSX.
    const handoffJsx = journalSrc.match(/<HandoffSheet[\s\S]{0,600}?\/>/);
    expect(handoffJsx).toBeTruthy();

    const jsx = handoffJsx![0];

    // dateKey must reference getTodayDateString(), not selectedDate.
    expect(jsx).toMatch(/dateKey=\{getTodayDateString\(\)\}/);
    expect(jsx).not.toMatch(/dateKey=\{selectedDate\}/);
  });

  it('HandoffSheet date prop is new Date() (always now)', () => {
    const handoffJsx = journalSrc.match(/<HandoffSheet[\s\S]{0,600}?\/>/);
    expect(handoffJsx).toBeTruthy();
    expect(handoffJsx![0]).toMatch(/date=\{new Date\(\)\}/);
  });
});
