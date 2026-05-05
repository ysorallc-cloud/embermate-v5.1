// ============================================================================
// Phase 5.11 — "This week" relocation contract.
//
// Pins the relocation: Journal no longer imports/renders the card; Insights
// renders RecentWindowCard under a "THIS WEEK" eyebrow, gated to building
// + populated states (not empty).
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

describe('Phase 5.11 — Insights hosts RecentWindowCard under THIS WEEK', () => {
  const insightsSrc = readFileSync(join(ROOT, 'app/(tabs)/understand.tsx'), 'utf8');

  it('Insights imports RecentWindowCard from components/understand/RecentWindowCard', () => {
    expect(insightsSrc).toMatch(
      /import\s+\{[^}]*\bRecentWindowCard\b[^}]*\}\s+from\s+['"][^'"]+understand\/RecentWindowCard['"]/,
    );
  });

  it("Insights renders the THIS WEEK eyebrow above the card", () => {
    expect(insightsSrc).toMatch(/'THIS WEEK'/);
  });

  it('Insights gates the section to NOT render in the empty state', () => {
    // Locate the THIS WEEK section block; assert it explicitly bails when
    // state === 'empty'.
    const idx = insightsSrc.indexOf("'THIS WEEK'");
    expect(idx).toBeGreaterThan(0);
    const window = insightsSrc.slice(Math.max(0, idx - 600), idx);
    expect(window).toMatch(/state\s*===\s*['"]empty['"]/);
  });

  it('Insights renders <RecentWindowCard /> inline with the THIS WEEK section', () => {
    expect(insightsSrc).toMatch(/<RecentWindowCard\b[\s\S]{0,160}?topPattern=/);
  });
});

describe('Phase 5.11 — relocated component file lives at the new path', () => {
  it('components/understand/RecentWindowCard.tsx exists', () => {
    expect(existsSync(join(ROOT, 'components/understand/RecentWindowCard.tsx'))).toBe(true);
  });

  it("the component's exported name is RecentWindowCard", () => {
    const src = readFileSync(
      join(ROOT, 'components/understand/RecentWindowCard.tsx'),
      'utf8',
    );
    expect(src).toMatch(/export\s+function\s+RecentWindowCard\b/);
  });
});
