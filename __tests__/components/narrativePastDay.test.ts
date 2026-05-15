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

// Phase 27.X — Journal NarrativeView gating contracts RETIRED.
// Past-day view now renders the same SOAP layout as today (with past-
// specific reframes in Section 1 + Section 4). NarrativeView is
// fully retired to intentional orphan per audit D4 + the Phase 27 F7
// NarrativeSnapshot retirement pattern. The retired contracts flip
// to absence pins defending the retirement direction; the component
// file's own export + shape contracts (above) stay green unchanged.
describe('Phase 27.X — NarrativeView gating retired (was Phase 5.12.c)', () => {
  it('retirement pin: journal.tsx does not import NarrativeView', () => {
    expect(journalSrc).not.toMatch(
      /import\s+\{[^}]*\bNarrativeView\b[^}]*\}\s+from\s+['"][^'"]*NarrativeView['"]/,
    );
  });

  it('retirement pin: journal.tsx does not render <NarrativeView />', () => {
    // Phase 27.X removed the isViewingPast → <NarrativeView /> ternary;
    // both today and past now render the four SOAP sections.
    expect(journalSrc).not.toMatch(/<NarrativeView\b/);
  });
});
