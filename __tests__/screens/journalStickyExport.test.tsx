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

  it('Phase 31 F3 — the CTA fires handleShareDaily directly (reframed from "opens HandoffSheet" pin)', () => {
    // Pre-F3 the CTA opened HandoffSheet via setHandoffSheetVisible(true)
    // — a 638-line preview modal that wrapped generateAndShareHandoff.
    // Phase 31 F3 (2026-05-21) retired HandoffSheet entirely; the
    // Journal page already shows all the data, so the modal was
    // redundant. The CTA now wires onPress directly to
    // handleShareDaily, which calls generateAndShareHandoff (PDF +
    // OS share sheet) without an intermediate modal.
    expect(journalSrc).toMatch(
      /testID=['"]journal-share-cta['"][\s\S]{0,300}onPress=\{handleShareDaily\}/,
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

  it('the CTA hides on empty days (no events, no notes — tone retired in F3)', () => {
    // The guard must check for at least one of dayEvents / reflection
    // text so an empty day does not surface a "share what?" button.
    // Phase 31 F3 — handoffTone retired from the predicate (the legacy
    // tone is folded into reflection text via consolidatedNotes, so it
    // shows up through that channel).
    const ctaIdx = journalSrc.indexOf("testID='journal-share-cta'");
    const ctaIdxAlt = journalSrc.indexOf('testID="journal-share-cta"');
    const idx = ctaIdx > 0 ? ctaIdx : ctaIdxAlt;
    expect(idx).toBeGreaterThan(0);
    const before = journalSrc.slice(Math.max(0, idx - 800), idx);
    expect(before).toMatch(/dayEvents|reflection|hasShareableContent/);
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
