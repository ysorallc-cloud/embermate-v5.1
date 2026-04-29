// ============================================================================
// Phase 9 — duplicate Share button removed from the page header.
// The HandoffCard at the bottom is the canonical Share entry point now.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Journal page — single Share affordance', () => {
  it('the page header does NOT render a Share pill anymore', () => {
    // The header used to render <TouchableOpacity ... accessibilityLabel=
    // "Share daily summary"> alongside the Report pill. After Phase 9 the
    // header carries only Report.
    expect(journalSrc).not.toMatch(/<TouchableOpacity[\s\S]{0,200}?Share daily summary/);
    expect(journalSrc).not.toMatch(/<Text style=\{s\.headerPillText\}>Share<\/Text>/);
  });

  it('the page header still renders the Report pill', () => {
    expect(journalSrc).toMatch(
      /<TouchableOpacity[\s\S]{0,200}?accessibilityLabel=\{[\s\S]*?(?:Clinical report|loading)[\s\S]*?\}/,
    );
    expect(journalSrc).toMatch(/<Text style=\{s\.headerPillReportText\}>Report<\/Text>/);
  });

  it('exactly one source location renders the "Share summary" CTA (HandoffCard)', () => {
    // The HandoffCard is in components/journal/HandoffCard.tsx; the journal
    // file imports and renders it but should not itself contain a literal
    // "Share summary" CTA.
    expect(journalSrc).not.toMatch(/<Text[^>]*>Share summary<\/Text>/);
    expect(journalSrc).toMatch(/<HandoffCard\b/);
  });

  it('the only Share-* accessibilityLabel left in journal.tsx is none — HandoffCard owns it', () => {
    const matches = journalSrc.match(/accessibilityLabel="Share[^"]*"/g) ?? [];
    expect(matches).toEqual([]);
  });
});
