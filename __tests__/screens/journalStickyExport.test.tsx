// ============================================================================
// Phase 5.12.g — sticky export CTA.
//
// Single anchored "Share handoff →" button at the bottom of the Journal
// page — the only primary action on the screen. Opens the existing
// HandoffSheet (which is now Journal's canonical share surface; the
// retired ExportChooserSheet referenced in the original spec was removed
// in the v6 UX restructure).
//
// Hidden when:
//   • The day is empty (no events, no notes, no tone) — nothing to share.
//   • The user is viewing a past day (handoff is today-only).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(
  join(ROOT, 'app/(tabs)/journal.tsx'),
  'utf8',
);

describe('Phase 5.12.g — sticky export CTA', () => {
  it('renders the "Share handoff" CTA copy', () => {
    expect(journalSrc).toMatch(/Share handoff/);
  });

  it('the CTA opens the existing HandoffSheet (single canonical share surface)', () => {
    // Stale-spec note: the original 5.12.g referenced ExportChooserSheet,
    // which the v6 UX restructure retired. The CTA must wire to
    // HandoffSheet via setHandoffSheetVisible(true) — the same primary
    // editor that the narrative snapshot's Edit affordance opens.
    expect(journalSrc).toMatch(
      /testID=['"]journal-share-cta['"][\s\S]{0,300}setHandoffSheetVisible\(\s*true\s*\)/,
    );
  });

  it('the CTA is anchored absolute at the bottom of the screen container', () => {
    // The sticky pattern: position absolute, bottom + left/right insets,
    // so it stays put while the scroll content moves underneath.
    const ctaStyle = journalSrc.match(/shareCta:\s*\{([^}]*)\}/);
    expect(ctaStyle).toBeTruthy();
    expect(ctaStyle![1]).toMatch(/position:\s*['"]absolute['"]/);
    expect(ctaStyle![1]).toMatch(/bottom:/);
  });

  it('the CTA hides on past days', () => {
    // The render guard must reference the existing isViewingPast flag
    // (or its inverse) so past-date navigation does not show a CTA that
    // would open today's handoff sheet.
    expect(journalSrc).toMatch(
      /isViewingToday[\s\S]{0,400}testID=['"]journal-share-cta['"]|!isViewingPast[\s\S]{0,400}testID=['"]journal-share-cta['"]/,
    );
  });

  it('the CTA hides on empty days (no events, no notes, no tone)', () => {
    // The same guard must check for at least one of dayEvents / reflection
    // text / handoffTone so an empty day does not surface a "share what?"
    // button.
    const guardWindow = journalSrc.match(
      /testID=['"]journal-share-cta['"][\s\S]{0,800}/,
    );
    expect(guardWindow).toBeTruthy();
    // Look back ~600 chars — the conditional that wraps the CTA should
    // contain at least one of the relevant signals.
    const ctaIdx = journalSrc.indexOf("testID='journal-share-cta'");
    const ctaIdxAlt = journalSrc.indexOf('testID="journal-share-cta"');
    const idx = ctaIdx > 0 ? ctaIdx : ctaIdxAlt;
    expect(idx).toBeGreaterThan(0);
    const before = journalSrc.slice(Math.max(0, idx - 800), idx);
    expect(before).toMatch(/dayEvents|reflection|handoffTone|hasShareableContent/);
  });
});

describe('Phase 5.12.g — single primary action contract', () => {
  it('removes the legacy HandoffCard share button (sticky CTA is the only primary)', () => {
    // The spec calls out: "The CTA is the page's only primary action."
    // HandoffCard's "Share summary" button was the previous primary;
    // both can't coexist or Journal grows two competing share entry
    // points.
    expect(journalSrc).not.toMatch(/<HandoffCard\b/);
  });
});
