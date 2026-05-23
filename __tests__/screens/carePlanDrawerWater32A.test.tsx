// ============================================================================
// Phase 32A F9 — Water drawer (DAILY GOAL dropdown, default 8 glasses).
//
// Brief: WHICH MEALS chips do not apply here — Water's drawer is one
// dropdown (6 / 8 / 10 glasses). Default: 8.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_PATH = join(ROOT, 'components/careplan/drawers/WaterDrawer.tsx');

describe('Phase 32A F9 — Water drawer', () => {
  it('contract 1: WaterDrawer file exists', () => {
    expect(existsSync(DRAWER_PATH)).toBe(true);
  });

  it('contract 2: care-plan/index.tsx imports + mounts <WaterDrawer />', () => {
    expect(INDEX_SRC).toMatch(/import\s*\{[^}]*\bWaterDrawer\b[^}]*\}\s*from\s*['"][^'"]*drawers\/WaterDrawer['"]/);
    expect(INDEX_SRC).toMatch(/<WaterDrawer\b/);
  });

  it('contract 3: drawer offers the three locked goal options (6, 8, 10)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    // The three goal numerics show up either as inline options array
    // or as conditional handler arguments. Pin all three.
    expect(src).toMatch(/\b6\b/);
    expect(src).toMatch(/\b8\b/);
    expect(src).toMatch(/\b10\b/);
  });

  it('contract 4: drawer writes via dailyGoalGlasses key (matches WaterBucketConfig)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/dailyGoalGlasses/);
  });

  it('contract 5: drawer is exported as a named component', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/export\s+(function|const)\s+WaterDrawer\b/);
  });
});
