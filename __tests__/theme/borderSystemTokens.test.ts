// ============================================================================
// B1–B4 border system tokens — existence + both modes.
//
// The five flat border tokens must exist in BOTH dark and light palettes so
// every surface can read a token instead of inline rgba. Alphas are
// PLACEHOLDERS (single-point tunable after device review) — this pins their
// EXISTENCE + register hue, not exact final values, except the two
// register-lane alphas which are the agreed placeholders (handoff 0.28,
// reflect 0.26) so a silent change is caught.
// ============================================================================

import { getDarkColors, getLightColors } from '../../theme/theme-tokens';

const TOKENS = ['borderNeutral', 'borderLift', 'borderInset', 'borderHandoff', 'borderReflect'] as const;

describe('B1–B4 border tokens — existence in both modes', () => {
  const dark = getDarkColors() as unknown as Record<string, string>;
  const light = getLightColors() as unknown as Record<string, string>;

  it.each(TOKENS)('dark defines %s (non-empty string)', (t) => {
    expect(typeof dark[t]).toBe('string');
    expect(dark[t].length).toBeGreaterThan(0);
  });

  it.each(TOKENS)('light defines %s (non-empty string)', (t) => {
    expect(typeof light[t]).toBe('string');
    expect(light[t].length).toBeGreaterThan(0);
  });

  it('neutral border maps to the Design-Lock values per mode', () => {
    expect(dark.borderNeutral).toBe('#2f3a32');
    expect(light.borderNeutral).toBe('#cfdace');
  });

  it('handoff = blue lane, reflect = coral lane, at the agreed placeholder alphas', () => {
    // Blue @ 0.28 (handoff), coral @ 0.26 (reflect) — dark palette hues.
    expect(dark.borderHandoff).toBe('rgba(143, 168, 200, 0.28)');
    expect(dark.borderReflect).toBe('rgba(227, 166, 132, 0.26)');
    // Light keeps the same lane alphas on the light hues.
    expect(light.borderHandoff).toContain('0.28');
    expect(light.borderReflect).toContain('0.26');
  });
});
