// ============================================================================
// Phase 5.12.a — Journal must not duplicate Now's missed-tasks dashboard.
//
// Pre-5.12 the page led with "TODAY'S OUTCOMES" + "5 not logged · 2 still
// to do." That made Journal a clone of Now and gave the page no narrative
// identity. The dashboard is removed; completion data demotes to a quiet
// 1-line footer in textTertiary at 10pt.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const journalSrc = readFileSync(
  join(ROOT, 'app/(tabs)/journal.tsx'),
  'utf8',
);

describe('Phase 5.12.a — Journal strips the missed-tasks dashboard', () => {
  it('Journal no longer imports TodayOutcomes', () => {
    expect(journalSrc).not.toMatch(
      /import\s+\{[^}]*\bTodayOutcomes\b[^}]*\}/,
    );
  });

  it('Journal no longer renders the <TodayOutcomes> JSX element', () => {
    expect(journalSrc).not.toMatch(/<TodayOutcomes\b/);
  });

  it('Journal does not render the "TODAY\'S OUTCOMES" eyebrow header anywhere', () => {
    expect(journalSrc).not.toMatch(/TODAY['’]?S OUTCOMES/);
  });

  it('demotes the completion count to a muted footer line', () => {
    // The footer line uses the canonical "N of M logged · K still to do"
    // template. textTertiary keeps it ambient — not a section header.
    expect(journalSrc).toMatch(/of\s+\$?\{?\w+\}?\s+logged/);
    expect(journalSrc).toMatch(/still to do/);
  });
});
