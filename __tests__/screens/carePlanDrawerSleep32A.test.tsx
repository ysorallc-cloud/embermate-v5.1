// ============================================================================
// Phase 32A F10 — Sleep drawer (TRACKED AT chips: Morning / Evening).
//
// Brief: chips (multi-select). Default Morning on.
// Persists via BucketConfig.timesOfDay (TimeOfDay[]).
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_PATH = join(ROOT, 'components/careplan/drawers/SleepDrawer.tsx');

describe('Phase 32A F10 — Sleep drawer', () => {
  it('contract 1: SleepDrawer file exists', () => {
    expect(existsSync(DRAWER_PATH)).toBe(true);
  });

  it('contract 2: care-plan/index.tsx imports + mounts <SleepDrawer />', () => {
    expect(INDEX_SRC).toMatch(/import\s*\{[^}]*\bSleepDrawer\b[^}]*\}\s*from\s*['"][^'"]*drawers\/SleepDrawer['"]/);
    expect(INDEX_SRC).toMatch(/<SleepDrawer\b/);
  });

  it('contract 3: drawer offers Morning + Evening chips', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/Morning/);
    expect(src).toMatch(/Evening/);
    // Underlying timeOfDay values pinned too.
    expect(src).toMatch(/['"]morning['"]/);
    expect(src).toMatch(/['"]evening['"]/);
  });

  it('contract 4: drawer reads/writes timesOfDay (canonical key)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/timesOfDay/);
  });

  it('contract 5: named export present', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/export\s+(function|const)\s+SleepDrawer\b/);
  });
});
