// ============================================================================
// You-tab wellness link — RETIRED in Phase 29 Batch B F4.
//
// Pre-B: the v6.7 Phase 4 design wrapped a compact row at the bottom of
// the You tab labeled "YOUR WELLNESS OVER TIME" routing to
// /caregiver-wellness. Batch B F4 folded that surface into the new
// ActionCardsRow as the Wellness card (pulse-outline icon, "Over time"
// subtitle, same /caregiver-wellness destination). The standalone
// wellnessLink row + its styles + its label retired.
//
// Per the repo's retirement-pin convention (journalDisclaimer.test.tsx,
// journalHeaderMoodLine.test.tsx, youTabFooterAffirmationPresence
// .test.tsx), the original presence contracts flip to absence contracts
// that defend against re-introduction. The file is preserved (not
// deleted) so the retirement is discoverable in future code archaeology.
//
// Five absence contracts cover what the original 9 presence pins guarded:
//   1. The "YOUR WELLNESS OVER TIME" label string no longer renders.
//   2. The wellnessLink style block is gone.
//   3. The wellnessLabel style block is gone.
//   4. The wellnessChevron style block is gone.
//   5. The accessibility intent ("View your wellness history") MOVED
//      to the Wellness card in ActionCardsRow — defense pin for the
//      relocation (sibling-test responsibility: ActionCardsRow's
//      contract 6 from actionCardsRow29B.test.tsx pins this on the
//      receiving side).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/(tabs)/support.tsx'), 'utf8');

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

describe('Phase 29 Batch B F4 — wellnessLink row retired (absence pins)', () => {
  it('absence pin 1: "YOUR WELLNESS OVER TIME" label string no longer renders', () => {
    expect(src).not.toContain('YOUR WELLNESS OVER TIME');
  });

  it('absence pin 2: wellnessLink style block retired', () => {
    expect(styleBlock('wellnessLink')).toBe('');
  });

  it('absence pin 3: wellnessLabel style block retired', () => {
    expect(styleBlock('wellnessLabel')).toBe('');
  });

  it('absence pin 4: wellnessChevron style block retired', () => {
    expect(styleBlock('wellnessChevron')).toBe('');
  });

  it('absence pin 5: support.tsx no longer carries the wellnessLink accessibilityLabel — moved to ActionCardsRow Wellness card', () => {
    // The pre-B accessibilityLabel "View your wellness history" lived on
    // the wellnessLink TouchableOpacity. Batch B F4 moved it to the
    // Wellness card's accessibilityHint (pinned by
    // __tests__/components/actionCardsRow29B.test.tsx contract 6).
    // support.tsx itself no longer carries the literal — Linking destination
    // for Wellness is now navigate('/caregiver-wellness') passed as the
    // onWellness handler prop.
    expect(src).not.toMatch(/accessibilityLabel=['"]View your wellness history['"]/);
  });
});
