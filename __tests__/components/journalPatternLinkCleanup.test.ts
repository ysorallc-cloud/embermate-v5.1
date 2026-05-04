// ============================================================================
// JournalPatternLink ("This week" card) cleanup — Phase 5d.
//
// Two pre-existing issues in components/journal/JournalPatternLink.tsx:
//
//   1. Asymmetric padding (paddingVertical: 10, paddingHorizontal: 12) —
//      diverges from the Phase 2 symmetric card-padding contract. The
//      original spec called for 12pt symmetric.
//
//   2. Hardcoded electric-purple rgba (rgb(183, 148, 244)) for bg + border —
//      outside the Phase 7 3-accent budget; the canonical lavender system
//      is the caregiverAccent token family (rgb 170, 138, 220) already in
//      use by EndOfShiftCard / aiInsightCard / etc.
//
// 5d fix:
//   • paddingVertical / paddingHorizontal → padding: Sizing.cardInternalPadding
//   • backgroundColor → c.caregiverAccentBg
//   • borderColor → c.caregiverAccentBorder
//
// The token migration is technically Phase 8 audit territory but is
// in-scope here because the file is being touched anyway and the visual
// inconsistency surfaces immediately on the Journal tab.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'components/journal/JournalPatternLink.tsx'),
  'utf8',
);

function extractStyleBody(name: string): string {
  const open = src.indexOf(`${name}: {`);
  if (open < 0) return '';
  const start = open + `${name}: {`.length;
  let depth = 1;
  let i = start;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  return src
    .slice(start, i - 1)
    .split('\n')
    .map((line) => line.replace(/^\s*\/\/.*$/, ''))
    .join('\n');
}

describe('Phase 5d — JournalPatternLink padding symmetry', () => {
  const card = extractStyleBody('card');

  it('padding routes through Sizing.cardInternalPadding (no axis split)', () => {
    expect(card).toMatch(/padding:\s*Sizing\.cardInternalPadding\b/);
  });

  it('paddingVertical and paddingHorizontal are removed (symmetric only)', () => {
    expect(card).not.toMatch(/paddingVertical:/);
    expect(card).not.toMatch(/paddingHorizontal:/);
  });
});

describe('Phase 5d — JournalPatternLink lavender palette routes through tokens', () => {
  const card = extractStyleBody('card');

  it('backgroundColor uses c.caregiverAccentBg (not a hardcoded rgba)', () => {
    expect(card).toMatch(/backgroundColor:\s*c\.caregiverAccentBg\b/);
  });

  it('borderColor uses c.caregiverAccentBorder (not a hardcoded rgba)', () => {
    expect(card).toMatch(/borderColor:\s*c\.caregiverAccentBorder\b/);
  });

  it('the legacy electric-purple rgba(183, 148, 244, ...) is gone from the file', () => {
    // Catches any of the prior literal pair (0.05 / 0.18) in any spot,
    // not just the card style block — defense in depth in case the file
    // grows additional surfaces later.
    expect(src).not.toMatch(/rgba\(183,\s*148,\s*244/);
  });
});

describe('Phase 5d — Sizing import plumbed', () => {
  it('JournalPatternLink imports Sizing from theme-tokens', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*\bSizing\b[^}]*\}\s*from\s*['"][^'"]*theme-tokens['"]/,
    );
  });
});
