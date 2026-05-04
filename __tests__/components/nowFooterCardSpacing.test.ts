// ============================================================================
// NowFooter card overlap + margin discipline — Phase 4.6.
//
// Device review showed the End of Shift card overlapping the Today's
// Journal preview card on Now. Two root causes in components/now:
//   1. journalPreviewCard had no marginBottom (sibling End of Shift card
//      was rendering against its bottom edge with no breathing room).
//   2. journalPreviewCard had a `marginHorizontal: 16` literal that
//      escaped the Phase 3.7 cascade and was double-padding the card vs
//      the page-edge contract from Phase 3 (paddingHorizontal: 14 on the
//      screen ScrollView). Net effect: journal preview was 30pt from
//      page edge while End of Shift was at 14pt — visibly narrower.
//
// 4.6 fix:
//   • journalPreviewCard: drop marginHorizontal entirely; route margins/
//     padding/radius through Spacing/Sizing tokens; add marginBottom:
//     Spacing.xs (8pt) so the sibling card below has breathing room.
//   • EndOfShiftCard: marginTop: 0 (the card above now provides the gap);
//     migrate the same way to tokens; bump borderWidth 1 → 0.5 to match
//     card-edge contract elsewhere.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const footerSrc = readFileSync(join(ROOT, 'components/now/NowFooter.tsx'), 'utf8');
const eosSrc = readFileSync(
  join(ROOT, 'components/now/EndOfShiftCard.tsx'),
  'utf8',
);

function extractStyleBody(src: string, name: string): string {
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
  // Strip whole-line `//` comments so prose mentions don't confuse
  // negative assertions designed for actual style assignments.
  return src
    .slice(start, i - 1)
    .split('\n')
    .map((line) => line.replace(/^\s*\/\/.*$/, ''))
    .join('\n');
}

describe('Phase 4.6 — journalPreviewCard margin discipline', () => {
  const block = extractStyleBody(footerSrc, 'journalPreviewCard');

  it('does NOT carry marginHorizontal (page-edge contract handles horizontal)', () => {
    expect(block).not.toMatch(/marginHorizontal:/);
  });

  it('marginTop routes through Spacing.md (no hardcoded literal)', () => {
    expect(block).toMatch(/marginTop:\s*Spacing\.md\b/);
  });

  it('marginBottom routes through Spacing.xs (8pt sibling-card gap)', () => {
    expect(block).toMatch(/marginBottom:\s*Spacing\.xs\b/);
  });

  it('padding routes through Sizing.cardInternalPadding (12pt)', () => {
    expect(block).toMatch(/padding:\s*Sizing\.cardInternalPadding\b/);
  });

  it('borderRadius routes through Sizing.cardRadius (no hardcoded literal)', () => {
    expect(block).toMatch(/borderRadius:\s*Sizing\.cardRadius\b/);
  });

  it('borderWidth is 0.5 (matches card-edge contract elsewhere)', () => {
    expect(block).toMatch(/borderWidth:\s*0\.5\b/);
  });
});

describe('Phase 4.6 — EndOfShiftCard margin discipline', () => {
  const block = extractStyleBody(eosSrc, 'card');

  it('marginTop is 0 (sibling above now provides the inter-card gap)', () => {
    expect(block).toMatch(/marginTop:\s*0\b/);
  });

  it('marginBottom routes through Spacing.xs', () => {
    expect(block).toMatch(/marginBottom:\s*Spacing\.xs\b/);
  });

  it('padding routes through Sizing.cardInternalPadding', () => {
    expect(block).toMatch(/padding:\s*Sizing\.cardInternalPadding\b/);
  });

  it('borderRadius routes through Sizing.cardRadius', () => {
    expect(block).toMatch(/borderRadius:\s*Sizing\.cardRadius\b/);
  });

  it('borderWidth is 0.5 (matches card-edge contract elsewhere)', () => {
    expect(block).toMatch(/borderWidth:\s*0\.5\b/);
  });
});

describe('Phase 4.6 — token imports plumbed', () => {
  it('NowFooter imports Spacing AND Sizing from theme-tokens', () => {
    expect(footerSrc).toMatch(
      /import\s*\{[^}]*\bSpacing\b[^}]*\bSizing\b[^}]*\}\s*from\s*['"][^'"]*theme-tokens['"]|import\s*\{[^}]*\bSizing\b[^}]*\bSpacing\b[^}]*\}\s*from\s*['"][^'"]*theme-tokens['"]/,
    );
  });

  it('EndOfShiftCard imports Spacing AND Sizing from theme-tokens', () => {
    expect(eosSrc).toMatch(
      /import\s*\{[^}]*\bSpacing\b[^}]*\bSizing\b[^}]*\}\s*from\s*['"][^'"]*theme-tokens['"]|import\s*\{[^}]*\bSizing\b[^}]*\bSpacing\b[^}]*\}\s*from\s*['"][^'"]*theme-tokens['"]/,
    );
  });
});
