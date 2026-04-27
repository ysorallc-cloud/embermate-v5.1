// ============================================================================
// StatRings — render-time properties guard.
// The behavioral test (statRings.test.tsx) confirms the JSX tree is built
// correctly. This file pins the stroke / rotation properties that decide
// whether the rings are visible on device after react-native-svg quirks
// and the v6.7 contrast lift.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '../../components/now/StatRings.tsx'),
  'utf8',
);

describe('StatRings render-time properties', () => {
  it('uses transform="rotate(...)" for the progress arc rotation', () => {
    // react-native-svg deprecated `rotation` + `origin` props on <Circle>
    // in v13. The supported way to start a progress arc at 12 o'clock is
    // a transform on the circle: rotate(-90, cx, cy).
    expect(src).toMatch(/transform=\{?[`'"]rotate\(\s*-?90/);
    // And no leftover deprecated rotation/origin props on the progress arc.
    expect(src).not.toMatch(/rotation=\{-?90\}/);
    expect(src).not.toMatch(/origin=\{`/);
  });

  it('progress arc stroke is the accent token (not a surface or transparent token)', () => {
    // Pluck the second <SvgCircle> block (the progress arc — first is the
    // background track) and verify it strokes with colors.accent.
    const circles = [...src.matchAll(/<SvgCircle[\s\S]*?\/>/g)].map(m => m[0]);
    expect(circles.length).toBeGreaterThanOrEqual(2);
    const progress = circles[1];
    expect(progress).toMatch(/stroke=\{colors\.accent\}/);
  });

  it('progress arc has a visible strokeWidth (>= 2)', () => {
    expect(src).toMatch(/RING_STROKE\s*=\s*([2-9]|\d{2,})/);
  });

  it('background track color has at least 0.10 opacity (readable against lifted glass)', () => {
    // The track color was 0.08 against the old #111111 glass — readable.
    // After the v6.7 lift to #1c2330 the same opacity blends too close to
    // the surface; require ≥ 0.10 so the unfilled portion of the ring is
    // still visible.
    const trackMatch = src.match(/trackColor[\s\S]*?rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/);
    expect(trackMatch).toBeTruthy();
    const alpha = parseFloat(trackMatch![1]);
    expect(alpha).toBeGreaterThanOrEqual(0.10);
  });

  it('SVG and Circle are imported from react-native-svg', () => {
    expect(src).toMatch(/from\s+['"]react-native-svg['"]/);
    expect(src).toMatch(/import\s+Svg.*Circle/);
  });

  it('Svg viewBox matches RING_SIZE square (no clipping)', () => {
    expect(src).toMatch(/viewBox=\{`0 0 \$\{RING_SIZE\} \$\{RING_SIZE\}`\}/);
  });

  it('progress arc is rendered (not commented out, not gated by a feature flag)', () => {
    // Defensive: count progress-arc occurrences. There should be exactly
    // one — the second SvgCircle inside the {!isEmpty && (...)} branch.
    const arcs = src.match(/strokeDashoffset=\{offset\}/g) || [];
    expect(arcs.length).toBe(1);
    // Make sure that arc is NOT inside a /* ... */ comment block.
    const commentBlocks = src.match(/\/\*[\s\S]*?\*\//g) || [];
    for (const block of commentBlocks) {
      expect(block).not.toContain('strokeDashoffset');
    }
  });
});
