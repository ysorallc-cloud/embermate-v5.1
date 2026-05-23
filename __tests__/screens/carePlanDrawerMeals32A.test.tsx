// ============================================================================
// Phase 32A F8 — Meals drawer (WHICH MEALS chips + reminders toggle).
//
// Brief: chips for Breakfast / Lunch / Dinner / Snack (multi-select);
// default Breakfast + Lunch + Dinner on. Reminders toggle default OFF.
// trackingStyle stays as a silent default 'quick' — no UI surface
// (hide-only per P-lock; field preserved in storage).
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_PATH = join(ROOT, 'components/careplan/drawers/MealsDrawer.tsx');

describe('Phase 32A F8 — Meals drawer', () => {
  it('contract 1: MealsDrawer file exists', () => {
    expect(existsSync(DRAWER_PATH)).toBe(true);
  });

  it('contract 2: care-plan/index.tsx imports + mounts <MealsDrawer />', () => {
    expect(INDEX_SRC).toMatch(/import\s*\{[^}]*\bMealsDrawer\b[^}]*\}\s*from\s*['"][^'"]*drawers\/MealsDrawer['"]/);
    expect(INDEX_SRC).toMatch(/<MealsDrawer\b/);
  });

  it('contract 3: chips cover Breakfast / Lunch / Dinner / Snack', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/Breakfast/);
    expect(src).toMatch(/Lunch/);
    expect(src).toMatch(/Dinner/);
    expect(src).toMatch(/Snack/);
  });

  it('contract 4: chips map to canonical TimeOfDay values (morning/midday/evening/night)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/['"]morning['"]/);
    expect(src).toMatch(/['"]midday['"]/);
    expect(src).toMatch(/['"]evening['"]/);
    expect(src).toMatch(/['"]night['"]/);
  });

  it('contract 5: timesOfDay + notificationsEnabled keys both wired', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/timesOfDay/);
    expect(src).toMatch(/notificationsEnabled/);
  });

  it('contract 6: NO trackingStyle UI surface (hide-only per P-lock)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    // Strip line + block comments — the file's header documents WHY
    // trackingStyle is absent from the UI, so we must not let that
    // documentation reference false-positive against the absence pin.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    // No trackingStyle field reads or writes in the code body.
    expect(stripped).not.toMatch(/trackingStyle/);
    // No "Quick Log" / "Detailed" picker labels in rendered text.
    expect(stripped).not.toMatch(/Quick Log|Detailed/i);
  });

  it('contract 7: named export present', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/export\s+(function|const)\s+MealsDrawer\b/);
  });
});
