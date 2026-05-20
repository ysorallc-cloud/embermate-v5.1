// ============================================================================
// Phase 33b extension Lock 4 — Insights empty-state canon migration.
//
// Pins the structural + spacing + font-scale canon migration of
// `components/understand/InsightsEmptyStatePreview.tsx`:
//
//   Structure: pre-fix wrapped both halves in one watchingCard with a
//   hairline divider. Post-fix splits into three separate cards via
//   JournalSection primitive — Patterns Coming (sage tint) + What
//   We'll Be Watching For (neutral) + Tip (neutral). Matches the
//   populated-state Section 1 + Section 2 card model so empty and
//   populated states use the same chrome family.
//
//   Spacing: hardcoded 13/14/11/10/4 → Spacing.s* canon tokens
//   throughout (s1=4, s2=8, s3=12, s4=16, s5=24). The key
//   breathing-room fix is watchingRow.paddingVertical 11 → s4 (16).
//
//   Font scale: sub-canon sizes (9.5, 8.5, 10.5) bumped to the 11pt+
//   canon threshold. SectionEyebrow already enforces the 11pt eyebrow
//   scale via the JournalSection primitive.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../..', 'components/understand/InsightsEmptyStatePreview.tsx'),
  'utf8',
);

describe('Phase 33b extension Lock 4 — Insights empty-state canon migration', () => {
  // --------------------------------------------------------------------------
  // Structural pins — three JournalSection cards (sage / neutral / neutral)
  // --------------------------------------------------------------------------

  it('imports JournalSection (replaces the prior bespoke watchingCard chrome)', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*\bJournalSection\b[^}]*\}\s*from\s*['"][^'"]*JournalSection['"]/,
    );
  });

  it('Patterns coming card renders via JournalSection with tint="sage"', () => {
    expect(SRC).toMatch(
      /<JournalSection[\s\S]{0,200}eyebrow="Patterns coming"[\s\S]{0,200}tint="sage"/,
    );
  });

  it('What we\'ll be watching for card renders via JournalSection with tint="neutral"', () => {
    expect(SRC).toMatch(
      /<JournalSection[\s\S]{0,200}eyebrow="What we'll be watching for"[\s\S]{0,200}tint="neutral"/,
    );
  });

  it('Tip card renders via JournalSection with tint="neutral" (canonized, was border-only chrome)', () => {
    expect(SRC).toMatch(
      /<JournalSection[\s\S]{0,200}eyebrow="Tip"[\s\S]{0,200}tint="neutral"/,
    );
  });

  it('retired structure markers are gone (regression defense)', () => {
    // Pre-fix had patternsCard / watchingCard / consolidatedTop /
    // hairlineDivider / watchingHeader bespoke chrome. JournalSection
    // owns all card chrome now; these style blocks should not exist.
    expect(SRC).not.toMatch(/^\s*patternsCard:\s*{/m);
    expect(SRC).not.toMatch(/^\s*watchingCard:\s*{/m);
    expect(SRC).not.toMatch(/^\s*consolidatedTop:\s*{/m);
    expect(SRC).not.toMatch(/^\s*hairlineDivider:\s*{/m);
    expect(SRC).not.toMatch(/^\s*watchingHeader:\s*{/m);
    expect(SRC).not.toMatch(/^\s*tipCard:\s*{/m);
  });

  // --------------------------------------------------------------------------
  // Spacing canon pins — Spacing.s* tokens, not hardcoded values
  // --------------------------------------------------------------------------

  it('Spacing token is imported from theme-tokens', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*\bSpacing\b[^}]*\}\s*from\s*['"][^'"]*theme-tokens['"]/,
    );
  });

  it('the key breathing-room row uses Spacing.s4 (16pt) — pre-fix paddingVertical was 11', () => {
    // watchingRow is the four-bullet list inside Card 2. The cramped
    // feel pre-fix came from 11pt paddingVertical; s4 bumps it to
    // 16pt for the canon row rhythm.
    expect(SRC).toMatch(/watchingRow:\s*\{[\s\S]+?paddingVertical:\s*Spacing\.s4/);
  });

  it('watchingRow.gap uses Spacing.s3 (was 10)', () => {
    expect(SRC).toMatch(/watchingRow:\s*\{[\s\S]+?gap:\s*Spacing\.s3/);
  });

  // --------------------------------------------------------------------------
  // Font scale canon pins — sub-canon sizes bumped above the 11pt floor
  // --------------------------------------------------------------------------

  it('progressLabel font size at 11pt (was 9.5)', () => {
    expect(SRC).toMatch(/progressLabel:\s*\{[\s\S]+?fontSize:\s*11/);
  });

  it('watchingDescription font size at 12pt (was 10.5)', () => {
    expect(SRC).toMatch(/watchingDescription:\s*\{[\s\S]+?fontSize:\s*12/);
  });

  it('watchingWhen font size at 10pt (was 8.5)', () => {
    expect(SRC).toMatch(/watchingWhen:\s*\{[\s\S]+?fontSize:\s*10/);
  });

  it('watchingHeaderSubtitle italic at 12pt (was 11)', () => {
    expect(SRC).toMatch(/watchingHeaderSubtitle:\s*\{[\s\S]+?fontSize:\s*12/);
  });

  it('watchingFooterText at 11pt (was 10)', () => {
    expect(SRC).toMatch(/watchingFooterText:\s*\{[\s\S]+?fontSize:\s*11/);
  });

  it('tipHeadline at 13pt (was 12.5) + tipSubtitle at 12pt (was 10.5)', () => {
    expect(SRC).toMatch(/tipHeadline:\s*\{[\s\S]+?fontSize:\s*13/);
    expect(SRC).toMatch(/tipSubtitle:\s*\{[\s\S]+?fontSize:\s*12/);
  });
});
