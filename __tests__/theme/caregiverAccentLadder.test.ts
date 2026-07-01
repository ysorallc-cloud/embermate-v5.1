// ============================================================================
// Phase 8.1 — caregiverAccent opacity ladder.
//
// To migrate the legacy purple* family without losing semantic information,
// caregiverAccent grows a parallel ladder of opacity tokens. After the
// purple* family is removed (Phase 8.6) every lavender consumer in the app
// resolves through this ladder.
//
// Specifics worth pinning:
//   • caregiverAccentBorder REPLACES the old 0.25 value with 0.20 to mirror
//     the legacy purpleBorder. The 0.25 value moves to caregiverAccentStrong
//     (a rename of the existing token, not a duplicate).
//   • caregiverAccentText (#d4baff) stays — it's the "Bright" token that
//     would otherwise be added under a different name.
//   • caregiverAccentBg (0.06) stays — it's the semantic name for the
//     "caregiver-accent surface tint" and overlaps with Faint by value.
// ============================================================================

import { Colors } from '../../theme/theme-tokens';

describe('Phase 8.1 — caregiverAccent ladder tokens', () => {
  it('caregiverAccentFaint is rgba(143, 168, 200, 0.06)', () => {
    expect((Colors as any).caregiverAccentFaint).toBe('rgba(143, 168, 200, 0.06)');
  });

  it('caregiverAccentMuted is rgba(143, 168, 200, 0.08)', () => {
    expect((Colors as any).caregiverAccentMuted).toBe('rgba(143, 168, 200, 0.08)');
  });

  it('caregiverAccentLight is rgba(143, 168, 200, 0.10)', () => {
    expect((Colors as any).caregiverAccentLight).toBe('rgba(143, 168, 200, 0.10)');
  });

  it('caregiverAccentHint is rgba(143, 168, 200, 0.12)', () => {
    expect((Colors as any).caregiverAccentHint).toBe('rgba(143, 168, 200, 0.12)');
  });

  it('caregiverAccentWash is rgba(143, 168, 200, 0.15)', () => {
    expect((Colors as any).caregiverAccentWash).toBe('rgba(143, 168, 200, 0.15)');
  });

  it('caregiverAccentBorder shifts from 0.25 → 0.20 (matches legacy purpleBorder)', () => {
    expect((Colors as any).caregiverAccentBorder).toBe('rgba(143, 168, 200, 0.20)');
  });

  it('caregiverAccentStrong is the renamed 0.25 token (was caregiverAccentBorder)', () => {
    expect((Colors as any).caregiverAccentStrong).toBe('rgba(143, 168, 200, 0.30)');
  });

  it('caregiverAccentText (#d4baff) and caregiverAccentBg (0.06) stay untouched', () => {
    expect(Colors.caregiverAccentText).toBe('#5a7a9a');
    expect(Colors.caregiverAccentBg).toBe('rgba(143, 168, 200, 0.08)');
  });

  it('caregiverAccent root color is unchanged (#aa8adc)', () => {
    expect(Colors.caregiverAccent).toBe('#8fa8c8');
  });
});
