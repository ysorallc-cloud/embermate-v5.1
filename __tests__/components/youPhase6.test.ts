// ============================================================================
// You tab — May 1 sizing pass Phase 6 (Batch B F4 reframes).
//
// Original Phase 6 pinned four contracts:
//   • ReflectionCard textarea minHeight ≤ 40 — REFRAMED in Phase 29 B F3
//     to the 3-line range (48-56). Old contract was a regression guard
//     against a legacy 60pt floor; F3's deliberate 3-line floor (~51px)
//     is a larger intentional value.
//   • ReflectionCard Save pill filled with sage — REFRAMED in Phase 29 B
//     F3 to caregiverAccent solid + white text (lane recolor).
//   • QuickResetPills "Helpline neutralized" — RETIRED in Phase 29 B F4.
//     QuickResetPills retired entirely; the Helpline action card's icon
//     color is pinned by actionCardsRow29B.test.tsx contract 2 (size 13,
//     caregiverAccent — lavender, not coral). The "no coral" intent is
//     preserved on the new surface; the source-grep on the old file is
//     obsolete (file deleted).
//   • Plan ahead grouped surface — RETIRED in Phase 29 B F4. The
//     planAheadCard wrapper retired; <ResourcesList variant="compact" />
//     renders chevron rows directly. The "single grouped surface" intent
//     is now expressed by the compact variant's chevron-row chrome
//     (pinned by resourcesListCompact29B.test.tsx).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const reflectionSrc = readFileSync(join(ROOT, 'components/support/ReflectionCard.tsx'), 'utf8');

describe('You tab Phase 6 — sizing + neutralized helpline (post-Batch-B reframes)', () => {
  describe('ReflectionCard textarea', () => {
    it('the input minHeight is in the 3-line range (Phase 29 Batch B F3)', () => {
      // Phase 29 Batch B F3 retired the Sizing.textareaMinHeight token
      // path in favor of a hardcoded 3-line literal (~51px). The pre-F3
      // ≤40pt contract was a regression guard against the legacy 60pt
      // floor; F3's 3-line floor is a deliberate larger value (~51px).
      // Pin the new 3-line range (48-56) — the contract intent flips
      // from "not too big" to "exactly 3 lines for the writing prompt".
      const m = reflectionSrc.match(/input:\s*\{[^}]*minHeight:\s*(\d+)/s);
      expect(m).not.toBeNull();
      const v = Number(m![1]);
      expect(v).toBeGreaterThanOrEqual(48);
      expect(v).toBeLessThanOrEqual(56);
    });
  });

  describe('ReflectionCard Save pill', () => {
    it('is filled with caregiverAccent (Phase 29 Batch B F3 — lane recolor from sage)', () => {
      // Phase 29 Batch B F3 — Save pill backgroundColor flipped from
      // sage solid (#5fb88a) to c.caregiverAccent (lane-coherent with
      // the new lavender card chrome).
      expect(reflectionSrc).toMatch(
        /saveButton:\s*\{[^}]*backgroundColor:\s*(c|colors)\.caregiverAccent\b/s,
      );
    });

    it('uses white text on the filled pill (Phase 29 Batch B F3 — lane recolor)', () => {
      // Phase 29 Batch B F3 — saveButtonText color flipped from
      // near-black (#0a1510) on sage to white (#fff) on lavender.
      // High contrast preserved; tone flips warm → cool.
      expect(reflectionSrc).toMatch(
        /saveButtonText:\s*\{[^}]*color:\s*['"]#(?:fff|FFF|ffffff|FFFFFF)['"]/s,
      );
    });
  });

  // QuickResetPills "Helpline neutralized" describe block retired —
  // QuickResetPills.tsx deleted in Phase 29 Batch B F4. The successor
  // assertions live in __tests__/components/actionCardsRow29B.test.tsx
  // (contract 2 pins the Helpline icon at caregiverAccent — lavender,
  // not coral — preserving the original Phase 6 anti-coral intent).

  // Plan ahead "single grouped surface" describe block retired —
  // planAheadCard wrapper retired in Phase 29 Batch B F4. The
  // compact ResourcesList variant's chevron-row chrome is now the
  // grouping (pinned by resourcesListCompact29B.test.tsx).
});
