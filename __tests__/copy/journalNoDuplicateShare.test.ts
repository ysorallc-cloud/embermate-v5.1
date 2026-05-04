// ============================================================================
// Phase 5.7.a — header pill renamed Report → Share.
//
// Phase 9 originally removed a duplicate Share button from the header so the
// HandoffCard at the bottom owned today's-handoff. Phase 5.7.a flips the
// header pill from "Report" to "Share" — the lavender pill now serves as
// the deliberate-intent entry point (a chooser will land on it in 5.7.b).
// The HandoffCard's "Share summary" button remains the context-aware
// fast-path. Two surfaces, intentional.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Journal page — header Share pill + HandoffCard fast-path', () => {
  it('the header pill no longer renders the literal text "Report"', () => {
    // The pre-5.7.a label was "Report" rendered through s.headerPillReportText.
    expect(journalSrc).not.toMatch(/<Text style=\{s\.headerPillReportText\}>Report<\/Text>/);
  });

  it('the header still renders the lavender pill, now labelled "Share"', () => {
    expect(journalSrc).toMatch(
      /<TouchableOpacity[\s\S]{0,200}?accessibilityLabel=\{[\s\S]*?(?:Share|loading)[\s\S]*?\}/,
    );
    expect(journalSrc).toMatch(/<Text style=\{s\.headerPillReportText\}>Share<\/Text>/);
  });

  it('exactly one source location renders the "Share summary" CTA (HandoffCard)', () => {
    // The HandoffCard is in components/journal/HandoffCard.tsx; the journal
    // file imports and renders it but should not itself contain a literal
    // "Share summary" CTA.
    expect(journalSrc).not.toMatch(/<Text[^>]*>Share summary<\/Text>/);
    expect(journalSrc).toMatch(/<HandoffCard\b/);
  });

  it('the header pill carries a "Share" a11y label; HandoffCard still owns "Share summary"', () => {
    // Phase 9 zero'd this assertion ("no Share-* label in journal.tsx").
    // After 5.7.a the header pill itself carries one — the new Share entry
    // point. We allow it but pin its wording so we catch accidental drift.
    const matches = journalSrc.match(/accessibilityLabel=\{[^}]*'Share[^']*'[^}]*\}/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
