// ============================================================================
// Jul 2 brief item 6 (Now half) — handoff-note indicator READ-PATH wiring.
//
// Standing rule [[feedback_input_validity_end_to_end]] applied to a READ: the
// persisted handoff note must SURFACE where expected (Now) and survive reload.
// Source-pin the full chain so a refactor can't silently sever it:
//   now.tsx: getConsolidatedNotes(today) → setHasHandoffNote → <NowFooter
//            hasHandoffNote=…>, loaded inside loadData (which the data listener
//            re-runs on EVENT.NOTES → live refresh + survives reload on focus).
//   NowFooter: forwards hasHandoffNote → <EndOfShiftCard hasHandoffNote=…>.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const now = readFileSync(join(ROOT, 'app/(tabs)/now.tsx'), 'utf8');
const footer = readFileSync(join(ROOT, 'components/now/NowFooter.tsx'), 'utf8');

describe('Now handoff-note indicator wiring', () => {
  it('now.tsx imports getConsolidatedNotes (the same store Journal Section 4 writes)', () => {
    expect(now).toMatch(/import\s*\{\s*getConsolidatedNotes\s*\}\s*from\s*['"][^'"]*consolidatedNotes['"]/);
  });

  it('now.tsx loads the note flag inside loadData and stores it', () => {
    expect(now).toMatch(/getConsolidatedNotes\(todayDate\)/);
    expect(now).toMatch(/setHasHandoffNote\(!!/);
  });

  it('now.tsx passes hasHandoffNote to NowFooter', () => {
    expect(now).toMatch(/hasHandoffNote=\{hasHandoffNote\}/);
  });

  it('the reload path covers EVENT.NOTES (live refresh + survives reload)', () => {
    // loadData is re-run by the data listener; EVENT.NOTES is in its set.
    expect(now).toMatch(/EVENT\.NOTES/);
  });

  it('NowFooter forwards hasHandoffNote to EndOfShiftCard', () => {
    expect(footer).toMatch(/hasHandoffNote\?:\s*boolean/);
    expect(footer).toMatch(/<EndOfShiftCard[^>]*hasHandoffNote=\{hasHandoffNote\}/);
  });
});
