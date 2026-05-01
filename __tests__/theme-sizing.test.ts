// ============================================================================
// theme spacing + sizing — locked v6.7 sizing contract.
//
// Every subsequent phase of the May 1 color discipline + sizing pass
// references these tokens; the test pins each value and the HIG-minimum
// touch target invariant.
// ============================================================================

import { Spacing, Sizing } from '../theme/theme-tokens';

describe('Theme spacing tokens', () => {
  it('cardPadding is 12', () => {
    expect(Spacing.cardPadding).toBe(12);
  });

  it('cardPaddingTight is 10 (used when card holds rows w/ own padding)', () => {
    expect(Spacing.cardPaddingTight).toBe(10);
  });

  it('cardGap is 10 (between sibling cards)', () => {
    expect(Spacing.cardGap).toBe(10);
  });

  it('sectionGap is 16 (between named sections)', () => {
    expect(Spacing.sectionGap).toBe(16);
  });

  it('rowGap is 8 (within a row of items)', () => {
    expect(Spacing.rowGap).toBe(8);
  });

  it('inlineGap is 6 (tight inline elements)', () => {
    expect(Spacing.inlineGap).toBe(6);
  });
});

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
