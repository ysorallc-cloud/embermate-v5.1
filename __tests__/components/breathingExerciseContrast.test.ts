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

  it('count is NOT rendered inside the 30%-opacity orbInner (would multiply down)', () => {
    // RN opacity multiplies through the subtree. Rendering the count under
    // a parent with opacity: 0.3 dims the digit to 0.3 effective opacity
    // even if the digit's own opacity is 1. The fix renders the count
    // outside the orbInner so the digit isn't subject to the disc's
    // transparency. Match either a self-closing <View ... /> or a paired
    // <View>...</View> form.
    const innerJsx =
      src.match(/<View style=\{\[styles\.orbInner[^>]*\/>/) ||
      src.match(/<View style=\{\[styles\.orbInner[\s\S]*?<\/View>/);
    expect(innerJsx).toBeTruthy();
    expect(innerJsx![0]).not.toMatch(/styles\.orbCount/);
  });

  it('orbInner still keeps an opacity below 1 (the green disc remains tinted)', () => {
    const block = styleBlock('orbInner');
    const op = num(block, 'opacity');
    expect(op).not.toBeNull();
    expect(op as number).toBeLessThan(1);
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
