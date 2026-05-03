// ============================================================================
// Spacing pass — Phase 1.
//
// Locks the canonical 4pt spacing scale + sizing extensions referenced
// across the May 1 spacing-rhythm spec. The legacy t-shirt block (xs=4,
// sm=8, md=12, lg=16, xl=20, xxl=24, xxxl=32, huge=48) is replaced with
// a shape that includes only multiples of 4 in the {4, 8, 12, 16, 24,
// 32} canonical set — no 20s or 48s.
//
// All ~700 call sites of Spacing.* are codemodded in lockstep so values
// are preserved at each site (with one deliberate lift: previously-xl
// values at 20pt step up to lg at 24pt — the user's "prefer breathing
// room over tight" guidance).
//
// Sizing extensions for the spacing-rhythm pass:
//   pageHorizontalPadding   14
//   cardInternalPadding     12
//   hairlineInset           12
//   quickActionMinHeight    64
// ============================================================================

import { Spacing as S, Sizing as Z } from '../theme/theme-tokens';

describe('Spacing pass Phase 1 — canonical 4pt scale', () => {
  it('Spacing exposes exactly the canonical 4pt keys (xxs/xs/sm/md/lg/xl)', () => {
    expect(Object.keys(S).sort()).toEqual(['lg', 'md', 'sm', 'xl', 'xs', 'xxs']);
  });

  it('Spacing values match the recalibrated scale (Phase 3.5)', () => {
    // Phase 3.5 (May 3 spacing recalibration) lifted md/lg/xl by 4pt
    // each. Device review of Phase 3 showed cards at 16pt sibling gaps
    // reading cramped on iOS, sections at 24pt reading too tight for a
    // clear break. xxs/xs/sm unchanged.
    expect((S as any).xxs).toBe(4);
    expect((S as any).xs).toBe(8);
    expect((S as any).sm).toBe(12);
    expect((S as any).md).toBe(20);  // was 16
    expect((S as any).lg).toBe(28);  // was 24
    expect((S as any).xl).toBe(36);  // was 32
  });

  it('every Spacing value is a multiple of 4 (no 6/10/14/18 sneaking in)', () => {
    for (const [, v] of Object.entries(S)) {
      expect(typeof v).toBe('number');
      expect((v as number) % 4).toBe(0);
    }
  });

  it('the 48pt step is gone from Spacing (was the unused `huge` token)', () => {
    // Pre-Phase-1, the legacy block carried `huge: 48`. The codemod
    // dropped it because nothing referenced it. Phase 3.5 keeps the
    // shape unchanged on that front; only md/lg/xl values shifted.
    const values = Object.values(S) as number[];
    expect(values).not.toContain(48);
  });
});

describe('Spacing pass Phase 1 — Sizing extensions', () => {
  it('keeps the prior sizing values', () => {
    expect(Z.buttonHeight).toBe(36);
    expect(Z.buttonHeightCompact).toBe(28);
    expect(Z.textareaMinHeight).toBe(36);
    expect(Z.cardRadius).toBe(13);
    expect(Z.pillRadius).toBe(10);
    expect(Z.buttonRadius).toBe(10);
    expect(Z.ringSize).toBe(30);
    expect(Z.iconSize).toBe(18);
  });

  it('exposes the new spacing-pass extensions', () => {
    expect((Z as any).pageHorizontalPadding).toBe(14);
    expect((Z as any).cardInternalPadding).toBe(12);
    expect((Z as any).hairlineInset).toBe(12);
    expect((Z as any).quickActionMinHeight).toBe(64);
  });
});
