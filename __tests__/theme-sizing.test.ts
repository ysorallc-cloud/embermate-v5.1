// ============================================================================
// theme spacing + sizing — locked sizing contract.
//
// Spacing-rhythm pass (May 1) replaced the prior provisional Spacing
// block — including the semantic tokens cardPadding / cardGap /
// sectionGap / rowGap / inlineGap (none of which had any actual call
// sites) — with a strict canonical 4pt scale. Those expectations are
// now in __tests__/theme-spacing-scale.test.ts. This file pins the
// Sizing token contract that survived the rename.
// ============================================================================

import { Sizing } from '../theme/theme-tokens';

describe('Theme sizing tokens', () => {
  it('buttonHeight is 36 (standard touch target)', () => {
    expect(Sizing.buttonHeight).toBe(36);
  });

  it('buttonHeight clears Apple HIG minimum touch target (>= 36)', () => {
    expect(Sizing.buttonHeight).toBeGreaterThanOrEqual(36);
  });

  it('buttonHeightCompact is 28 (secondary inline buttons)', () => {
    expect(Sizing.buttonHeightCompact).toBe(28);
  });

  it('textareaMinHeight is 36 (empty placeholder height)', () => {
    expect(Sizing.textareaMinHeight).toBe(36);
  });

  it('textareaMinHeight stays at or below 40 (compact empty state)', () => {
    expect(Sizing.textareaMinHeight).toBeLessThanOrEqual(40);
  });

  it('cardRadius is 13', () => {
    expect(Sizing.cardRadius).toBe(13);
  });

  it('pillRadius is 10', () => {
    expect(Sizing.pillRadius).toBe(10);
  });

  it('buttonRadius is 10', () => {
    expect(Sizing.buttonRadius).toBe(10);
  });

  it('ringSize is 30 (stat tile ring diameter)', () => {
    expect(Sizing.ringSize).toBe(30);
  });

  it('iconSize is 18 (standard inline icon)', () => {
    expect(Sizing.iconSize).toBe(18);
  });
});
