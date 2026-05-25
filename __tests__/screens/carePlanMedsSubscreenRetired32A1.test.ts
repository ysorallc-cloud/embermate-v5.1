// ============================================================================
// Phase 32A.1 F7 — retire app/care-plan/meds.tsx subscreen.
//
// The MedicationsDrawer (F1-F6) fully replaces what /care-plan/meds did:
//   - meds list rendering        → MedicationsDrawer body (F2)
//   - per-row active toggle      → F2 Switch
//   - swipe-to-remove            → F3 (soft-delete now)
//   - quick-add panel            → F4 (behind +Add button)
//   - empty state                → F5
//   - discoverable Edit mode     → F6
// HealthKit Auto-Import was never on this subscreen (lives at
// utils/parked/vitalsHealthKitAutoImport.parked.tsx per 32A F13's
// preservation; not affected here).
//
// /medication-form is OUT OF SCOPE — the per-med edit/add form
// continues to live there; this F retires the LIST subscreen only.
//
// Caller rewires (atomic with deletion):
//   - components/careplan/AddItemSheet.tsx:36 — "Medication" route
//     → /medication-form (the form survives; adding a med goes
//     direct to the form).
//   - components/now/FirstTimeWelcomeCard.tsx:69 — ctaDestination for
//     (meds enabled + 0 meds) → /medication-form?source=careplan
//     (Q-32A.1.4 lock: one tap to add, not two via the drawer).
//   - app/care-plan/index.tsx — F1 already retired the
//     handleConfigureBucket('meds') navigate path. No additional code
//     change here; only stale comment refs may need touch-up.
//
// Audit + adjacent tests reframed:
//   - __tests__/app/care-plan-gating.test.ts (pinned old chevron
//     navigate path; reframed to drawer-toggle pattern)
//   - __tests__/components/firstTimeWelcomeCardCtaBranching.test.tsx
//     (pinned the old route; reframed to new direct-to-form route)
//   - __tests__/care-plan-medication-swipe.test.ts (read meds.tsx;
//     reframed to read MedicationsDrawer.tsx OR retire)
//   - __tests__/screens/medsRowProtection.test.ts (same)
//   - __tests__/screens/subScreenHeaderContract.test.ts (drop the
//     meds.tsx entry from target list)
//   - __tests__/screens/carePlanPriorityRemoved32A.test.tsx (drop
//     CARE_PLAN_MEDS constant from SURFACES list)
// ============================================================================

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Phase 32A.1 F7 — app/care-plan/meds.tsx retired', () => {
  it('contract 1: app/care-plan/meds.tsx does NOT exist', () => {
    expect(existsSync(join(ROOT, 'app/care-plan/meds.tsx'))).toBe(false);
  });

  it('contract 2: /medication-form remains live (per-med form is OUT OF SCOPE)', () => {
    expect(existsSync(join(ROOT, 'app/medication-form.tsx'))).toBe(true);
  });

  it('contract 3: AddItemSheet "Medication" route → /medication-form', () => {
    const src = readFileSync(
      join(ROOT, 'components/careplan/AddItemSheet.tsx'),
      'utf8',
    );
    // The Medication item type must route to the form, not the list.
    // Pull the ITEM_TYPES Medication entry's route string.
    const m = src.match(/label:\s*['"]Medication['"][\s\S]{0,200}?route:\s*['"]([^'"]+)['"]/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('/medication-form');
  });

  it('contract 4: FirstTimeWelcomeCard CTA routes direct to /medication-form?source=careplan (Q-32A.1.4)', () => {
    const src = readFileSync(
      join(ROOT, 'components/now/FirstTimeWelcomeCard.tsx'),
      'utf8',
    );
    // The shouldRouteToMedsForm branch must point at the form's
    // careplan-sourced add route, NOT at /care-plan/meds.
    expect(src).toMatch(/['"`]\/medication-form\?source=careplan['"`]/);
    // And NO leftover /care-plan/meds literal.
    expect(src).not.toMatch(/['"`]\/care-plan\/meds['"`]/);
  });

  it('contract 5: NO non-test source file references the retired /care-plan/meds route literal', () => {
    // Repo-wide sweep across the standard source tree. Skips
    // node_modules, ios, android, tests, and the parked directory.
    // Comments are stripped so historical commentary doesn't false-
    // positive — only live route literals matter.
    const offenders: string[] = [];

    function walk(dir: string) {
      let entries: string[];
      try { entries = readdirSync(dir); } catch { return; }
      for (const name of entries) {
        if (['node_modules', '__tests__', '.git', '.expo', 'ios', 'android', 'build', 'dist'].includes(name)) continue;
        const full = join(dir, name);
        let isDir = false;
        try { isDir = statSync(full).isDirectory(); } catch { continue; }
        if (isDir) { walk(full); continue; }
        if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue;
        const src = readFileSync(full, 'utf8');
        const stripped = src
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '');
        // Match the route as a quoted string literal so /care-plan/meds
        // (a path) doesn't false-positive on /care-plan/medsX or
        // /care-plan/medications.
        if (/['"`]\/care-plan\/meds['"`]/.test(stripped)) {
          offenders.push(full.replace(ROOT + '/', ''));
        }
      }
    }

    for (const top of ['app', 'components', 'utils', 'services', 'hooks', 'lib', 'storage', 'types', 'constants']) {
      walk(join(ROOT, top));
    }

    if (offenders.length > 0) {
      throw new Error(
        `Retired /care-plan/meds route still referenced in non-test source:\n` +
          offenders.map((o) => '  ' + o).join('\n'),
      );
    }
    expect(offenders).toEqual([]);
  });
});
