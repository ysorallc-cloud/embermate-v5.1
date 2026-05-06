// ============================================================================
// Phase 7.2 — Quick Reset pill lift.
//
// The three pills (Breathe / Helpline / Community) are the You tab's
// highest-frequency actions. Lift them so they read as primary, not as
// peer-equal navigation:
//   • minHeight bumps to 52pt (consistent tap target above HIG floor)
//   • Subtle iOS-style elevation shadow + Android elevation
//   • Icon size up by 1 step (18 → 20)
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(
  join(ROOT, 'components/support/QuickResetPills.tsx'),
  'utf8',
);

function styleBlock(name: string): string {
  const re = new RegExp(`\\b${name}:\\s*\\{([\\s\\S]*?)\\n\\s{2}\\}`, '');
  const m = src.match(re);
  return m ? m[1] : '';
}
function num(block: string, prop: string): number | null {
  const m = block.match(new RegExp(`\\b${prop}:\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? Number(m[1]) : null;
}

describe('Phase 7.2 — Quick Reset pill prominence', () => {
  const pill = styleBlock('pill');
  const icon = styleBlock('icon');

  it('pill block is present', () => {
    expect(pill).not.toBe('');
  });

  it('pill enforces a 52pt minimum tap target (HIG ≥ 44pt)', () => {
    // Either a fixed `height: 52` at the top level, or `minHeight: 52`
    // (the latter is preferred — content-driven sizing with a floor).
    const minH = num(pill, 'minHeight');
    const heightAtTop = pill.match(/^\s*height:\s*(-?\d+(?:\.\d+)?)/m);
    const h = heightAtTop ? Number(heightAtTop[1]) : null;
    const winner = minH ?? h;
    expect(winner).toBe(52);
  });

  it('pill has an iOS-style shadow (shadowOpacity / shadowRadius / shadowOffset present)', () => {
    expect(pill).toMatch(/shadowOpacity:/);
    expect(pill).toMatch(/shadowRadius:/);
    expect(pill).toMatch(/shadowOffset:/);
  });

  it('pill has an Android elevation token', () => {
    expect(pill).toMatch(/elevation:\s*\d+/);
  });

  it('icon size bumps to 20pt (one step up from 18)', () => {
    expect(num(icon, 'fontSize')).toBe(20);
  });
});
