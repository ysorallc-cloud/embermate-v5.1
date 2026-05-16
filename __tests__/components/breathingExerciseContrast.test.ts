// ============================================================================
// BreathingExercise — count contrast + phase-transition haptics.
// The count digit must read clearly against the green-tinted disc, and
// phase changes must fire one Haptics.selectionAsync() pulse (not per-second).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'components/support/BreathingExercise.tsx'),
  'utf8',
);

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([^}]*)\\}`, 's');
  const m = src.match(re);
  return m ? m[1] : '';
}

function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('BreathingExercise — count digit contrast', () => {
  it('orbCount style does not reduce its own opacity below 0.85', () => {
    const block = styleBlock('orbCount');
    expect(block).not.toBe('');
    const op = num(block, 'opacity');
    if (op !== null) {
      expect(op).toBeGreaterThanOrEqual(0.85);
    }
  });

  it('count is NOT rendered inside any opacity-reduced parent (Phase 29 Batch A.2 F2 reframe)', () => {
    // RN opacity multiplies through the subtree. Pre-A.2 the View-based
    // orb wrapped the count digit alongside an `orbInner` View at
    // opacity 0.3 — the original concern was that nesting the count
    // inside the dimmed inner disc would multiply the digit's effective
    // opacity to 0.3. A.2 F2 replaced the View orb with the OrbRings
    // SVG primitive; no opacity-reduced wrapper survives. The count
    // sits as an absolutely-positioned sibling of <OrbRings /> under
    // the `orbWrap` container, with no opacity on the wrapper.
    //
    // Reframed pin: no parent with opacity < 1 contains the orbCount.
    // The specific orbInner shape is gone, so we scan for any inline
    // opacity style anywhere up-tree of styles.orbCount.
    const opacityWrapAroundCount = src.match(
      /<View[^>]*opacity:\s*0?\.\d+[^>]*>[\s\S]*?styles\.orbCount/,
    );
    expect(opacityWrapAroundCount).toBeNull();
  });

  it('orbInner style block retired (Phase 29 Batch A.2 F2 — absence pin)', () => {
    // The pre-A.2 View orb had its own `orbInner` style block carrying
    // opacity 0.3 + backgroundColor accent. A.2 F2 retired the View
    // orb entirely in favor of OrbRings; the orbInner style block
    // should no longer exist. A future regression that reintroduces
    // it would re-introduce the opacity-multiplication risk this
    // contract guards against.
    expect(styleBlock('orbInner')).toBe('');
  });
});

describe('BreathingExercise — phase-transition haptics', () => {
  it('imports expo-haptics', () => {
    expect(src).toMatch(/from\s+['"]expo-haptics['"]/);
  });

  it('calls Haptics.selectionAsync somewhere in the file', () => {
    expect(src).toMatch(/Haptics\.selectionAsync\(/);
  });

  it('haptic fires inside startCount (one pulse per phase entry)', () => {
    const startCountBlock = src.match(/const startCount = useCallback\(\([^)]*\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*\]\)/);
    expect(startCountBlock).toBeTruthy();
    expect(startCountBlock![0]).toMatch(/Haptics\.selectionAsync/);
  });

  it('the per-second count interval does NOT fire haptics (avoid per-tick buzz)', () => {
    const intervalBlock = src.match(/setInterval\(\(\)\s*=>\s*\{[\s\S]*?\},\s*1000\)/);
    expect(intervalBlock).toBeTruthy();
    expect(intervalBlock![0]).not.toMatch(/Haptics\.selectionAsync/);
  });
});
