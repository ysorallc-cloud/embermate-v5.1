// ============================================================================
// Phase 2 — "Needs attention · 2 meds missed" callout removed.
// Today's Outcomes' missed row now carries this signal; no duplicate above
// the card.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Journal — Needs attention callout removed', () => {
  it('no <View style={s.statusBlock}> renders between the date strip and Outcomes', () => {
    expect(journalSrc).not.toMatch(/<View\s+style=\{s\.statusBlock\}/);
  });

  it('the dayStatus indicator block is no longer in the rendered tree', () => {
    expect(journalSrc).not.toMatch(/style=\{s\.statusDot\}/);
    expect(journalSrc).not.toMatch(/style=\{s\.statusLabel\}/);
    expect(journalSrc).not.toMatch(/style=\{s\.statusDetail\}/);
  });

  it('the literal "Needs attention" copy is not rendered as a callout', () => {
    // The string can still appear as part of an internal helper that is no
    // longer rendered (e.g. the dayStatus useMemo) — but no JSX should
    // surface it. Confirm by checking that no <Text> wraps it directly.
    expect(journalSrc).not.toMatch(/<Text[^>]*>[^<]*Needs attention[^<]*<\/Text>/);
  });
});
