// ============================================================================
// Phase 5.11 — "This week" relocation contract.
//
// Pins the relocation: Journal no longer imports/renders the card.
//
// Phase 15.10 — Insights side of the relocation retired. The "THIS WEEK"
// RecentWindowCard duplicated the Vitals BP tile (canonical BP surface
// lives in the Vitals 4-tile grid). The Insights-hosting contracts below
// are flipped to retirement pins documenting the absence. The Journal
// half of the original 5.11 contract still holds (Journal must NOT host
// the card) — those pins remain.
//
// RecentWindowCard.tsx is left in place as orphan source for a separate
// cleanup scope (15.6 buildJournalPreview pattern). The file-existence
// pin below documents that — it is intentional orphan, not a missed
// deletion.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Phase 5.11 — Journal no longer hosts the "This week" card', () => {
  const journalSrc = readFileSync(join(ROOT, 'app/(tabs)/journal.tsx'), 'utf8');

  it('Journal does not import RecentWindowCard or JournalPatternLink', () => {
    expect(journalSrc).not.toMatch(/RecentWindowCard/);
    expect(journalSrc).not.toMatch(/JournalPatternLink/);
  });

  it('Journal does not render <RecentWindowCard /> or <JournalPatternLink />', () => {
    expect(journalSrc).not.toMatch(/<RecentWindowCard\b/);
    expect(journalSrc).not.toMatch(/<JournalPatternLink\b/);
  });

  it('the file at the legacy path components/journal/JournalPatternLink.tsx is gone', () => {
    expect(existsSync(join(ROOT, 'components/journal/JournalPatternLink.tsx'))).toBe(false);
  });
});

describe('Phase 15.10 — Insights no longer hosts RecentWindowCard (was Phase 5.11)', () => {
  // Pre-15.10 Insights rendered the "THIS WEEK" RecentWindowCard as a
  // relocation from Journal. 15.10 retires the duplicate surface; the
  // Vitals 4-tile grid is the canonical BP surface. Pins below assert
  // the absence so the section cannot quietly re-introduce.
  const insightsSrc = readFileSync(join(ROOT, 'app/(tabs)/understand.tsx'), 'utf8');

  it('Insights no longer imports RecentWindowCard', () => {
    expect(insightsSrc).not.toMatch(
      /import\s+\{[^}]*\bRecentWindowCard\b[^}]*\}/,
    );
  });

  it("Insights no longer renders the 'THIS WEEK' eyebrow", () => {
    expect(insightsSrc).not.toMatch(/'THIS WEEK'/);
  });

  it('Insights no longer renders <RecentWindowCard /> anywhere', () => {
    expect(insightsSrc).not.toMatch(/<RecentWindowCard\b/);
  });

  it('Insights no longer threads topPattern state', () => {
    // The state machinery had only one consumer (the retired card).
    // Pin the cleanup so a future "reintroduce a top pattern surface"
    // change comes with intent (and doesn't re-import getAllInsights
    // by accident).
    expect(insightsSrc).not.toMatch(/\btopPattern\b/);
    expect(insightsSrc).not.toMatch(/\bgetAllInsights\b/);
  });
});

describe('Phase 15.10 — RecentWindowCard.tsx is intentional orphan source', () => {
  // The component file is left in place after 15.10 retired its sole
  // consumer. Filed for a separate cleanup scope (matches the 15.6
  // buildJournalPreview pattern). Pinned so a future "tidy up unused
  // components" pass routes through that scope rather than deleting
  // the file as a side effect.
  it('components/understand/RecentWindowCard.tsx still exists (intentional orphan)', () => {
    expect(existsSync(join(ROOT, 'components/understand/RecentWindowCard.tsx'))).toBe(true);
  });

  it("the component's exported name is still RecentWindowCard", () => {
    const src = readFileSync(
      join(ROOT, 'components/understand/RecentWindowCard.tsx'),
      'utf8',
    );
    expect(src).toMatch(/export\s+function\s+RecentWindowCard\b/);
  });
});
