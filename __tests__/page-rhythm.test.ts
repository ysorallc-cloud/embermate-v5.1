// ============================================================================
// Page rhythm contract — May 1 spacing-rhythm Phase 3.
//
// Every tab page (Now, Journal, Insights, You) follows a single rhythm:
//
//   • ScrollView contentContainerStyle: paddingTop 24, paddingHorizontal 14
//   • Below the hero header (page H1 + subtitle), the vertical sequence is:
//       Header → first card     marginTop: 16  (md)
//       Card   → next card      marginTop: 16  (md)
//       Card   → eyebrow        marginTop: 16  (md) on eyebrow
//       Eyebrow → its card      marginTop: 8   (xs) on card
//   • Eyebrow components (all-caps section labels living outside cards)
//     get paddingHorizontal: 14 to align with cards, plus marginBottom 8.
//
// This test pins the ScrollView padding contract. The 16-8-16 vertical
// rhythm is per-tab and applied as part of Phase 3b (per-tab rhythm pass).
//
// Token equivalents accepted:
//   24 → Spacing.lg
//   16 → Spacing.md
//   14 → Sizing.pageHorizontalPadding
//   8  → Spacing.xs
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const TABS = [
  'app/(tabs)/now.tsx',
  'app/(tabs)/journal.tsx',
  'app/(tabs)/understand.tsx',
  'app/(tabs)/support.tsx',
];

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

// Find a named style block's body (balanced braces). Style files in this
// codebase use either a top-level `const styles = StyleSheet.create({...})`
// or a `createStyles(c) => StyleSheet.create({...})` factory.
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
  return src.slice(start, i - 1);
}

function valueMatches(body: string, prop: string, ...accepts: string[]): boolean {
  // Look for `prop: <value>` (single line value) and check if value matches
  // any of the accepted forms.
  const m = body.match(new RegExp(`\\b${prop}:\\s*([^,\\n}]+)`));
  if (!m) return false;
  const v = m[1].trim();
  return accepts.some((a) => v === a);
}

describe('Phase 3 — page rhythm: ScrollView padding contract', () => {
  describe.each(TABS)('%s', (rel) => {
    const src = read(rel);
    const body = extractStyleBody(src, 'scrollContent');

    it('scrollContent style block exists', () => {
      expect(body.length).toBeGreaterThan(0);
    });

    it('paddingTop is 24 (Spacing.lg) — or set via padding shorthand', () => {
      // Accept either explicit `paddingTop: 24` / `paddingTop: Spacing.lg`,
      // OR the shorthand `padding: 24` / `padding: Spacing.lg` (which
      // implies all four sides).
      const okExplicit = valueMatches(body, 'paddingTop', '24', 'Spacing.lg');
      const okShorthand = valueMatches(body, 'padding', '24', 'Spacing.lg');
      expect(okExplicit || okShorthand).toBe(true);
    });

    it('paddingHorizontal is 14 (Sizing.pageHorizontalPadding) — or via shorthand', () => {
      const okExplicit = valueMatches(
        body,
        'paddingHorizontal',
        '14',
        'Sizing.pageHorizontalPadding',
      );
      const okShorthand = valueMatches(body, 'padding', '14', 'Sizing.pageHorizontalPadding');
      expect(okExplicit || okShorthand).toBe(true);
    });
  });
});
