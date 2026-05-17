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

describe('Spacing pass Phase 1 — canonical 4pt scale (Phase 33 F2 extended)', () => {
  it('Spacing exposes the original canonical keys (xxs/xs/sm/md/lg/xl) plus Phase 33 numeric s1..s12', () => {
    // Phase 33 F2 (Q-33.1 lock) added the website source-of-truth
    // numeric scale alongside the existing t-shirt names. Both systems
    // coexist — t-shirt names preserve the Phase 3.5 deliberate
    // breathing-room lift (md=20/lg=28/xl=36); numeric names give
    // access to the website canonical rungs (s4=16, s5=24, s6=32, etc).
    const keys = Object.keys(S).sort();
    expect(keys).toContain('xxs');
    expect(keys).toContain('xs');
    expect(keys).toContain('sm');
    expect(keys).toContain('md');
    expect(keys).toContain('lg');
    expect(keys).toContain('xl');
    expect(keys).toContain('s1');
    expect(keys).toContain('s12');
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

  it('Phase 33 F2 numeric scale values match the website source-of-truth', () => {
    expect((S as any).s1).toBe(4);
    expect((S as any).s2).toBe(8);
    expect((S as any).s3).toBe(12);
    expect((S as any).s4).toBe(16);
    expect((S as any).s5).toBe(24);
    expect((S as any).s6).toBe(32);
    expect((S as any).s7).toBe(48);
    expect((S as any).s8).toBe(64);
    expect((S as any).s9).toBe(96);
    expect((S as any).s10).toBe(128);
    expect((S as any).s11).toBe(160);
    expect((S as any).s12).toBe(200);
  });

  it('every Spacing value is a multiple of 4 (no 6/10/14/18 sneaking in)', () => {
    for (const [, v] of Object.entries(S)) {
      expect(typeof v).toBe('number');
      expect((v as number) % 4).toBe(0);
    }
  });
});

describe('Spacing pass Phase 1 — Sizing extensions', () => {
  it('keeps the prior sizing values', () => {
    expect(Z.buttonHeight).toBe(36);
    expect(Z.buttonHeightCompact).toBe(28);
    expect(Z.textareaMinHeight).toBe(36);
    expect(Z.cardRadius).toBe(14); // Phase 33 F2 — aligned to website --radius: 14 (was 13)
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
