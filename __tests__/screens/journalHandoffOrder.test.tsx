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
  it('imports TodayOutcomes', () => {
    expect(src).toMatch(/import\s+\{\s*TodayOutcomes\s*\}\s+from\s+['"][^'"]+TodayOutcomes['"]/);
  });

  it('imports JournalNotesCard', () => {
    expect(src).toMatch(/import\s+\{\s*JournalNotesCard\s*\}\s+from\s+['"][^'"]+JournalNotesCard['"]/);
  });

  it('imports JournalPatternLink', () => {
    expect(src).toMatch(/import\s+\{\s*JournalPatternLink\s*\}\s+from\s+['"][^'"]+JournalPatternLink['"]/);
  });

  it('imports HandoffCard', () => {
    expect(src).toMatch(/import\s+\{\s*HandoffCard\s*\}\s+from\s+['"][^'"]+HandoffCard['"]/);
  });

  it('imports HandoffSheet', () => {
    expect(src).toMatch(/import\s+\{\s*HandoffSheet\s*\}\s+from\s+['"][^'"]+HandoffSheet['"]/);
  });

  it('renders TodayOutcomes', () => {
    expect(src).toMatch(/<TodayOutcomes\b/);
  });

  it('renders JournalNotesCard', () => {
    expect(src).toMatch(/<JournalNotesCard\b/);
  });

  it('renders JournalPatternLink', () => {
    expect(src).toMatch(/<JournalPatternLink\b/);
  });

  it('renders HandoffCard', () => {
    expect(src).toMatch(/<HandoffCard\b/);
  });

  it('renders HandoffSheet', () => {
    expect(src).toMatch(/<HandoffSheet\b/);
  });
});

describe('Journal — section order in the rendered tree', () => {
  it('TodayOutcomes appears before JournalNotesCard', () => {
    const outcomes = src.indexOf('<TodayOutcomes');
    const notes = src.indexOf('<JournalNotesCard');
    expect(outcomes).toBeGreaterThan(-1);
    expect(notes).toBeGreaterThan(-1);
    expect(outcomes).toBeLessThan(notes);
  });

  it('JournalNotesCard appears before <JournalPatternLink', () => {
    const notes = src.indexOf('<JournalNotesCard');
    const pattern = src.indexOf('<JournalPatternLink');
    expect(notes).toBeLessThan(pattern);
  });

  it('JournalPatternLink appears before <HandoffCard', () => {
    const pattern = src.indexOf('<JournalPatternLink');
    const handoff = src.indexOf('<HandoffCard');
    expect(pattern).toBeLessThan(handoff);
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

  it('does not render the floating <SectionEyebrow> wrappers anymore', () => {
    // Eyebrows now live INSIDE TodayOutcomes / JournalNotesCard.
    expect(src).not.toMatch(/<SectionEyebrow\b/);
  });
});
