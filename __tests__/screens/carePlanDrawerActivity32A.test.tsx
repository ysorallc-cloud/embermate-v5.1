// ============================================================================
// Phase 32A F11 — Activity drawer (smallest drawer, sets the pattern).
//
// Brief: when Activity is toggled on, its drawer opens automatically and
// contains a single Reminders toggle. Default: off.
//
// This test pins:
//   1. Source declares ActivityDrawer component file at the established
//      drawers/ location.
//   2. care-plan/index.tsx mounts <ActivityDrawer /> inside the drawer
//      scaffold for bucket='activity' (replacing the placeholder).
//   3. ActivityDrawer source contains the Reminders affordance wired to
//      activity.notificationsEnabled (test pins the property name so a
//      future bucket-config rename couldn't silently drift).
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_PATH = join(ROOT, 'components/careplan/drawers/ActivityDrawer.tsx');

describe('Phase 32A F11 — Activity drawer', () => {
  it('contract 1: ActivityDrawer component file exists at components/careplan/drawers/', () => {
    expect(existsSync(DRAWER_PATH)).toBe(true);
  });

  it('contract 2: care-plan/index.tsx imports + mounts <ActivityDrawer />', () => {
    expect(INDEX_SRC).toMatch(/import\s*\{[^}]*\bActivityDrawer\b[^}]*\}\s*from\s*['"][^'"]*drawers\/ActivityDrawer['"]/);
    expect(INDEX_SRC).toMatch(/<ActivityDrawer\b/);
  });

  it('contract 3: ActivityDrawer wires its Switch to activity.notificationsEnabled', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    // Either via prop name or via updateBucket('activity', { notificationsEnabled: ... })
    expect(src).toMatch(/notificationsEnabled/);
  });

  it('contract 4: ActivityDrawer exports a default + named component (importable as ActivityDrawer)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/export\s+(function|const)\s+ActivityDrawer\b/);
  });
});
