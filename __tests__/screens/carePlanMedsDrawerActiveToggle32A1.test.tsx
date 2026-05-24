// ============================================================================
// Phase 32A.1 F2 — MedicationsDrawer extraction + per-row active toggle.
//
// Two-part F:
//
//   1) Extract the inline meds-list rendering from care-plan/index.tsx
//      into a dedicated `components/careplan/drawers/MedicationsDrawer.tsx`
//      component file, matching the pattern established by the other 7
//      drawers in Slice B of 32A.
//
//   2) Add a per-row Switch (active toggle) — preserves the subscreen
//      behavior the F4 inline list omitted. Toggling `active=false`
//      keeps the med in storage (history preserved) but excludes it
//      from instance generation. Q-32A.1.5 lock: KEEP per-row active
//      toggle — pausing a med is a real capability, dropping it would
//      be the only destructive loss in the phase.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_PATH = join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

describe('Phase 32A.1 F2 — MedicationsDrawer extraction', () => {
  // --------------------------------------------------------------------------
  // Component file exists + named export
  // --------------------------------------------------------------------------

  it('contract 1: MedicationsDrawer file exists at components/careplan/drawers/', () => {
    expect(existsSync(DRAWER_PATH)).toBe(true);
  });

  it('contract 2: MedicationsDrawer exports a named component', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/export\s+(function|const)\s+MedicationsDrawer\b/);
  });

  // --------------------------------------------------------------------------
  // care-plan/index.tsx — mounts the component, retires the inline JSX
  // --------------------------------------------------------------------------

  it('contract 3: care-plan/index.tsx imports + mounts <MedicationsDrawer />', () => {
    const stripped = stripComments(INDEX_SRC);
    expect(stripped).toMatch(/import\s*\{[^}]*\bMedicationsDrawer\b[^}]*\}\s*from\s*['"][^'"]*drawers\/MedicationsDrawer['"]/);
    expect(stripped).toMatch(/<MedicationsDrawer\b/);
  });

  it('contract 4: the inline meds-list JSX block in care-plan/index.tsx is retired (moved into MedicationsDrawer)', () => {
    const stripped = stripComments(INDEX_SRC);
    // testID="meds-inline-list" is the testID anchor pinned by F4 in
    // 32A. After extraction it lives in MedicationsDrawer.tsx, not in
    // the home screen JSX. Pin its absence from index.tsx so the
    // inline JSX block can't silently come back.
    expect(stripped).not.toMatch(/testID=["']meds-inline-list["']/);
    // The drawer's testID lives in the component file.
    const drawerSrc = readFileSync(DRAWER_PATH, 'utf8');
    expect(drawerSrc).toMatch(/testID=["']meds-inline-list["']/);
  });

  it('contract 5: care-plan/index.tsx mounts the drawer conditionally on medsExpanded (F1 gating preserved)', () => {
    const stripped = stripComments(INDEX_SRC);
    // Find the <MedicationsDrawer mount; check 200 chars before it
    // for the medsExpanded conditional.
    const idx = stripped.search(/<MedicationsDrawer\b/);
    expect(idx).toBeGreaterThan(-1);
    const before = stripped.slice(Math.max(0, idx - 200), idx);
    expect(before).toMatch(/medsExpanded\s*&&|medsExpanded\s*\?/);
  });
});

describe('Phase 32A.1 F2 — per-row active toggle (Q-32A.1.5 lock)', () => {
  const drawerSrc = readFileSync(DRAWER_PATH, 'utf8');
  const stripped = stripComments(drawerSrc);

  // --------------------------------------------------------------------------
  // Switch component rendered per row, wired to med.active
  // --------------------------------------------------------------------------

  it('contract 6: per-row Switch imported from react-native', () => {
    expect(stripped).toMatch(/import\s*\{[^}]*\bSwitch\b[^}]*\}\s*from\s*['"]react-native['"]/);
  });

  it('contract 7: Switch renders inside the per-med row, bound to med.active', () => {
    // The Switch's value prop must read med.active (the canonical
    // MedicationPlanItem field — see types/carePlanConfig.ts:323).
    expect(stripped).toMatch(/<Switch[\s\S]{0,500}?value=\{[^}]*\bmed\.active\b/);
  });

  it('contract 8: Switch onValueChange writes via updateMedication with an active field', () => {
    // The MedicationsDrawer must call updateMedication with the new
    // active flag. This preserves Q-32A.1.5 — toggle flips active
    // without destroying the med. Accept either inline `med.id` OR a
    // wrapping callback that passes the medId param through.
    expect(stripped).toMatch(/updateMedication\s*\([^)]*,\s*\{\s*active\b/);
  });

  // --------------------------------------------------------------------------
  // Visual cue — inactive row reads differently from active
  // --------------------------------------------------------------------------

  it('contract 9: inactive rows render with a visual de-emphasis (matches subscreen behavior)', () => {
    // The subscreen had `medItemInactive` and `medNameInactive` styles
    // that greyed out inactive meds. Drawer must apply some
    // visually-distinct state for !med.active so the user sees the
    // toggle reflected. Pin a conditional style application based on
    // active state.
    expect(stripped).toMatch(/!med\.active\s*&&\s*styles\.|med\.active\s*\?\s*[^:]*:\s*styles\./);
  });

  // --------------------------------------------------------------------------
  // Storage round-trip — toggling active writes through useCarePlanConfig
  // --------------------------------------------------------------------------

  it('contract 10: drawer consumes useCarePlanConfig (self-managing data, matches WellnessDrawer pattern)', () => {
    // MedicationsDrawer self-manages its data via useCarePlanConfig
    // (matching WellnessDrawer's useWellnessSettings pattern — both
    // are drawers with rich content that bridge to their own hooks
    // rather than receiving raw config + onUpdate props).
    expect(stripped).toMatch(/useCarePlanConfig/);
  });

  // --------------------------------------------------------------------------
  // Edit + add deep-links preserved
  // --------------------------------------------------------------------------

  it('contract 11: per-row tap still routes to /medication-form?id=<medId>&source=careplan', () => {
    expect(stripped).toMatch(/\/medication-form\?id=\$\{[^}]+\}&source=careplan/);
  });

  it('contract 12: "+ Add medication" affordance still routes to /medication-form?source=careplan (no id)', () => {
    expect(stripped).toMatch(/['"`]\/medication-form\?source=careplan['"`]/);
  });
});
