// ============================================================================
// Phase 29 Batch B — composition-level meta-pins.
//
// Component-level contracts for the Batch B work live in:
//   • __tests__/components/actionCardsRow29B.test.tsx (7 contracts on the
//     new ActionCardsRow component — order, Ionicons, handler invocation,
//     accessibility, row structure)
//   • __tests__/components/resourcesListCompact29B.test.tsx (8 contracts
//     on the new variant prop — default unchanged, compact has chevrons,
//     per-row navigate)
//   • __tests__/app/resourcesSubscreen29B.test.tsx (5 contracts on the
//     new /resources route — file + SubScreenHeader + default variant)
//
// Structural-pin reframes for the Batch B swaps live in:
//   • __tests__/screens/youTabComposition.test.ts (JSX order +
//     ActionCardsRow handlers + retirement absence pins)
//   • __tests__/screens/youTabReflection.test.tsx (component renders +
//     file dependency list)
//   • __tests__/screens/youTabWellnessLink.test.ts (full retirement,
//     5 absence pins)
//   • __tests__/screens/youTabFooterWitness.test.tsx (mock swap)
//   • __tests__/screens/youTabMoment29.test.tsx (F3.7 reframe —
//     singleton + hardcoded autoStart)
//   • __tests__/components/youPhase6.test.ts (F3 collateral + retirement
//     describe block retirements)
//   • __tests__/components/youTabRefinements.test.tsx (F3 collateral +
//     QuickResetPills absence + planAheadCard removal)
//
// This file holds the COMPOSITION-LEVEL meta-pins that don't have a
// natural home in the above — invariants on the Batch B work as a
// whole. Three contracts.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const SUPPORT_SRC = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');
const STRIPPED = SUPPORT_SRC
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Phase 29 Batch B — composition meta-pins', () => {
  it('meta 1: all three Batch B additions are wired into support.tsx', () => {
    // Three new components/surfaces shipped in Batch B (one per major F):
    //   F2 ActionCardsRow component — replaces QuickResetPills
    //   F1 ResourcesList variant="compact" — replaces the planAheadCard
    //   F1 /resources subscreen — reached via ResourcesList compact rows
    //
    // Imports defend against future cleanup that removes a Batch B
    // dependency without realizing it's still consumed.
    expect(STRIPPED).toMatch(
      /import\s*\{[^}]*\bActionCardsRow\b[^}]*\}\s*from\s*['"][^'"]*ActionCardsRow['"]/,
    );
    expect(STRIPPED).toMatch(/<ActionCardsRow\b/);
    expect(STRIPPED).toMatch(/<ResourcesList\s+variant=['"]compact['"]/);
    expect(existsSync(join(ROOT, 'app/resources.tsx'))).toBe(true);
  });

  it('meta 2: all three Batch B retirements are absent from support.tsx', () => {
    // Three pre-B surfaces fully retired in F4:
    //   QuickResetPills — file + 2 tests deleted; production mount gone
    //   wellnessLink TouchableOpacity row — destination folded into the
    //     Wellness action card
    //   planAheadCard wrapper — chevron rows in compact ResourcesList
    //     are the chrome now
    //
    // Source-level absence at the support.tsx surface. The
    // QuickResetPills file-level absence is independently pinned by
    // youTabRefinements.test.tsx; this contract pins the support.tsx
    // composition specifically.
    expect(STRIPPED).not.toMatch(/<QuickResetPills\b/);
    expect(STRIPPED).not.toMatch(/styles\.wellnessLink/);
    expect(STRIPPED).not.toMatch(/styles\.planAheadCard/);
    expect(STRIPPED).not.toMatch(/styles\.planAheadBody/);
  });

  it('meta 3: Wellness card destination preserves the retired wellnessLink intent', () => {
    // R1 (Batch B audit): the Wellness action card carries the same
    // semantic destination as the retired wellnessLink row —
    // /caregiver-wellness via navigate. The accessibility continuity
    // (the original "View your wellness history" intent) is pinned on
    // the receiving side by actionCardsRow29B.test.tsx contract 6
    // (accessibilityHint matches). This composition-level pin asserts
    // the WIRING in support.tsx routes the Wellness handler correctly.
    expect(STRIPPED).toMatch(
      /<ActionCardsRow[\s\S]*?onWellness=\{\s*\(\s*\)\s*=>\s*navigate\(['"]\/caregiver-wellness['"]\)\s*\}/,
    );
  });
});
