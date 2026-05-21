// ============================================================================
// Journal page — handoff redesign vertical order.
//
// Phase 1 of the v6.7 spacing tightening moved the eyebrows INSIDE
// TodayOutcomes / JournalNotesCard. The page-level structure that remains
// is asserted here: imports + render shape + render order.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

describe('Journal — new sections present', () => {
  it('no longer imports TodayOutcomes (Phase 5.12.a stripped the dashboard)', () => {
    // Pre-5.12 Journal led with the missed-tasks dashboard. That made the
    // page a clone of Now. The dashboard is removed; completion data
    // lives in a quiet footer line at the bottom.
    expect(src).not.toMatch(/import\s+\{[^}]*\bTodayOutcomes\b[^}]*\}/);
  });

  it('imports JournalNotesCard', () => {
    expect(src).toMatch(/import\s+\{\s*JournalNotesCard\s*\}\s+from\s+['"][^'"]+JournalNotesCard['"]/);
  });

  it('no longer imports JournalPatternLink (Phase 5.11 relocated to Insights)', () => {
    // The card moved out of Journal to /(tabs)/understand.tsx as
    // RecentWindowCard. Journal no longer imports it.
    expect(src).not.toMatch(/JournalPatternLink/);
  });

  it('no longer imports HandoffCard (Phase 5.12.g — sticky CTA replaces it)', () => {
    // Phase 5.12.g introduced a single sticky "Share handoff" CTA as
    // the page's only primary action. HandoffCard's competing share
    // affordance was retired here.
    expect(src).not.toMatch(/import\s+\{[^}]*\bHandoffCard\b[^}]*\}/);
  });

  it('imports HandoffSheet', () => {
    expect(src).toMatch(/import\s+\{\s*HandoffSheet\s*\}\s+from\s+['"][^'"]+HandoffSheet['"]/);
  });

  it('no longer renders <TodayOutcomes> (Phase 5.12.a)', () => {
    expect(src).not.toMatch(/<TodayOutcomes\b/);
  });

  it('renders JournalNotesCard', () => {
    expect(src).toMatch(/<JournalNotesCard\b/);
  });

  it('no longer renders JournalPatternLink (Phase 5.11 relocated to Insights)', () => {
    expect(src).not.toMatch(/<JournalPatternLink\b/);
  });

  it('no longer renders <HandoffCard> (Phase 5.12.g)', () => {
    expect(src).not.toMatch(/<HandoffCard\b/);
  });

  it('renders HandoffSheet', () => {
    expect(src).toMatch(/<HandoffSheet\b/);
  });
});

describe('Journal — section order in the rendered tree', () => {
  it('the sticky share CTA renders below the in-flow content (Phase 5.12.g)', () => {
    // After 5.12.g, HandoffCard was removed and replaced by an absolute-
    // positioned sticky CTA. The CTA's testID lands LATE in the file
    // (after the JSX of all in-flow sections) since it sits inside the
    // outer screen container after the SafeAreaView/ScrollView close.
    const notes = src.indexOf('<JournalNotesCard');
    const sticky = src.indexOf("testID=\"journal-share-cta\"");
    expect(notes).toBeGreaterThan(-1);
    expect(sticky).toBeGreaterThan(notes);
  });
});

describe('Journal — deprecated sections removed', () => {
  it('does not render <JournalSummary', () => {
    expect(src).not.toMatch(/<JournalSummary\b/);
  });

  it('does not render <JournalFlagged (the old "Heads up" section)', () => {
    expect(src).not.toMatch(/<JournalFlagged\b/);
  });

  it('does not render <JournalPatterns (the old multi-row patterns paragraph)', () => {
    expect(src).not.toMatch(/<JournalPatterns\b/);
  });

  it('does not render <ReportPreviewModal (replaced by HandoffSheet)', () => {
    expect(src).not.toMatch(/<ReportPreviewModal\b/);
  });

  it('does not render <ReflectionPrompt (replaced by JournalNotesCard)', () => {
    expect(src).not.toMatch(/<ReflectionPrompt\b/);
  });

  it('does not include the old "fresh start" italic line', () => {
    expect(src).not.toMatch(/Today's a fresh start/);
  });

  it('does not include a top-level alert callout that duplicates outcomes', () => {
    // The Heads up section + its summary copy are gone. The dayStatus
    // indicator block (small dot + "Needs attention" label) was also
    // retired in the v6.7 tightening pass — its signal is carried by the
    // missed row inside TodayOutcomes.
    expect(src).not.toMatch(/<JournalFlagged\b/);
    expect(src).not.toMatch(/buildHandoffNotes\(/);
    expect(src).not.toMatch(/<View\s+style=\{s\.statusBlock\}/);
  });

  it('does not reference the deprecated reflection prompt rotation', () => {
    expect(src).not.toMatch(/getDailyPrompt\(/);
  });

  it('Phase 27 F4 — page-level SectionEyebrow for the merged footer "For the record" (reframed from Phase 22.2 BUILDING TOWARD pin)', () => {
    // Pre-22.2 eyebrows lived only INSIDE the section components.
    // Phase 22.2 added a single page-level <SectionEyebrow text="Building
    // toward" tint="caregiverAccent" /> above the lavender-tinted feed-
    // forward banner.
    //
    // Phase 27 F4 (2026-05-21) collapses BUILDING TOWARD into the
    // merged footer. The dedicated "Building toward" eyebrow retires;
    // its function is absorbed by a single "For the record" eyebrow
    // at the top of the merged footer block (Q-27.3 single-eyebrow-
    // block lock). The building-toward affordance becomes a quiet
    // text link beneath that eyebrow — no dedicated section eyebrow.
    //
    // Pin the post-F4 reality: exactly one page-level <SectionEyebrow>
    // and its text is "For the record" (no tint — neutral fallback).
    // The "Building toward" eyebrow is absent (defended by
    // journalMergedFooter27 contract 3).
    const eyebrows = src.match(/<SectionEyebrow\b[\s\S]*?\/>/g) || [];
    expect(eyebrows.length).toBe(1);
    expect(eyebrows[0]).toMatch(/text=["']For the record["']/);
    expect(eyebrows[0]).not.toMatch(/text=["']Building toward["']/);
  });
});
