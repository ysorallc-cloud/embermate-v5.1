// ============================================================================
// Commit 8 — Narrative past-day mode
//
// Source-level contract: the journal renders a NarrativeView when the
// caregiver is looking at a past date, surfacing a prose summary, summary
// pills, notable moments, and the saved past-day notes. Today still uses
// the live outcomes/handoff layout.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');
const narrativeViewSrc = readFileSync(
  join(ROOT, 'components/journal/NarrativeView.tsx'),
  'utf8',
);
const builderSrc = readFileSync(
  join(ROOT, 'utils/narrativeSummaryBuilder.ts'),
  'utf8',
);

describe('NarrativeView — surfaces', () => {
  it('renders a narrativeCard surface for the past-day prose summary', () => {
    expect(narrativeViewSrc).toMatch(/narrativeCard/);
  });

  it('renders summary pills (summaryPill style hook)', () => {
    expect(narrativeViewSrc).toMatch(/summaryPill/);
  });

  it('renders notable moments from the day (notableMoment hook)', () => {
    expect(narrativeViewSrc).toMatch(/notableMoment/);
  });

  it('renders the past-day notes block (pastNotes hook)', () => {
    expect(narrativeViewSrc).toMatch(/pastNotes/);
  });
});

describe('narrativeSummaryBuilder — shape', () => {
  it('exports buildDayNarrative as the entry point', () => {
    expect(builderSrc).toMatch(/export\s+async\s+function\s+buildDayNarrative\s*\(/);
  });

  it('returns a DayNarrative with summary, summaryPills, notableMoments, notes', () => {
    expect(builderSrc).toMatch(/summary\b/);
    expect(builderSrc).toMatch(/summaryPills\b/);
    expect(builderSrc).toMatch(/notableMoments\b/);
    expect(builderSrc).toMatch(/notes\b/);
  });

  it('is template-driven (no external LLM/fetch calls)', () => {
    expect(builderSrc).not.toMatch(/\bfetch\s*\(/);
    expect(builderSrc).not.toMatch(/openai|anthropic|claude\.ai/i);
  });
});

describe('Journal — NarrativeView is gated by isViewingToday', () => {
  it('imports NarrativeView from components/journal/NarrativeView', () => {
    expect(journalSrc).toMatch(
      /import\s+\{[^}]*\bNarrativeView\b[^}]*\}\s+from\s+['"][^'"]*NarrativeView['"]/,
    );
  });

  it('renders NarrativeView only when not viewing today', () => {
    // Guarded by the isViewingPast / !isViewingToday flag.
    expect(journalSrc).toMatch(
      /(isViewingPast|!isViewingToday)[\s\S]{0,200}<NarrativeView/,
    );
  });
});
