// ============================================================================
// Insights zero-day empty state teasers — Phase 4 update.
//
// The legacy under-7-days "At 7 days / At 14 days" teaser banners were
// consolidated into a single InsightsEmptyStatePreview card (Phase 4 of the
// v6.7 visual-consistency pass). The empty state still teases what's coming
// — the copy moved into the consolidated card, anchored on "PATTERNS COMING"
// + the "WHAT WE'LL BE WATCHING FOR" rows. This test reframes the prior
// teaser-presence check to assert the new structure without re-pinning the
// removed text strings.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const understandSrc = readFileSync(
  join(__dirname, '../../app/(tabs)/understand.tsx'),
  'utf8',
);
const previewSrc = readFileSync(
  join(__dirname, '../../components/understand/InsightsEmptyStatePreview.tsx'),
  'utf8',
);

describe('Insights zero-day empty state teasers (Phase 4)', () => {
  it('understand.tsx renders InsightsEmptyStatePreview for under-14-day windows', () => {
    // Phase 3.7.3 wrapped the literal `daysOfData < 14` gate in the
    // classifyInsightsState helper. Accept either wiring — both pin the
    // same threshold (POPULATED_DAYS_THRESHOLD = 14).
    const usesGating =
      /gating\.showPatternsComing[\s\S]{0,300}<InsightsEmptyStatePreview/.test(
        understandSrc,
      );
    const usesLiteral = /pageData\.daysOfData\s*<\s*14[\s\S]{0,200}<InsightsEmptyStatePreview/.test(
      understandSrc,
    );
    expect(usesGating || usesLiteral).toBe(true);
  });

  it('understand.tsx no longer carries the legacy teaser strings', () => {
    expect(understandSrc).not.toContain('At 7 days: weekly mood and sleep trends');
    expect(understandSrc).not.toContain('At 14 days: medication adherence patterns');
  });

  it('the consolidated card carries the patterns-coming + 4-row teaser content', () => {
    // PATTERNS COMING eyebrow + "more days, then trends appear" + the four
    // pattern preview rows. The wording is in the component now, not in
    // understand.tsx itself.
    expect(previewSrc).toContain('PATTERNS COMING');
    // Source has the count and the rest in separate template literals
    // (`${remaining} more day${...}` then `, then trends appear`), so
    // assert each fragment independently rather than as one regex.
    expect(previewSrc).toMatch(/more day\$\{remaining === 1 \? '' : 's'\}/);
    expect(previewSrc).toContain('then trends appear');
    expect(previewSrc).toContain("WHAT WE'LL BE WATCHING FOR");
  });
});
