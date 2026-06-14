// ============================================================================
// WELLNESS MERGE — F4 wizard/drawer write parity (Option A).
//
// The onboarding wizard (confirm step) and the Care Plan drawer both
// toggle wellness windows. Pre-F4 each carried its OWN copy of the
// membership math:
//   • storage/carePlanConfigRepo.setWellnessWindowEnabled (wizard)
//   • WellnessWindowsDrawer.handleEnableChange (drawer, inline)
// Identical results, but a duplicated "second write path" — a future
// edit to one could silently fork the other.
//
// F4 collapses both onto utils/wellnessWindowMembership
// .nextWellnessWindowMembership. The wizard stays enable-only toggles
// (no time/reminder controls — onboarding is the rush-to-first-relief
// flow); time/reminder tuning stays in the drawer the user reaches
// later. Divergence #2 (wizard writes no wellnessSettings, so new
// users get store defaults) is ACCEPTED and pinned by the
// onboarding→drawer defaults-consistency contract in
// __tests__/components/wellnessWindowsDrawerF3.test.tsx.
//
// CONTRACTS
//   Anti-duplication (the RED driver):
//     1. Both the repo helper and the drawer import + call the shared
//        nextWellnessWindowMembership; neither re-inlines the math.
//   Behavioral parity / non-regression (safety net — REAL repo, no
//   mocks on the pipeline):
//     2. timesOfDay parity, morning-only.
//     3. timesOfDay parity, morning+evening.
//     4. Legacy-period preservation: toggling morning/evening hide-not-
//        deletes a stored 'midday'/'night' (wizard can't show it, must
//        not drop it).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOrCreateCarePlanConfig,
  saveCarePlanConfig,
  setWellnessWindowEnabled,
} from '../../storage/carePlanConfigRepo';
import { nextWellnessWindowMembership } from '../../utils/wellnessWindowMembership';

jest.mock('../../utils/devLog', () => ({ logError: () => {}, devLog: () => {} }));

const ROOT = join(__dirname, '../..');
const REPO_SRC = readFileSync(join(ROOT, 'storage/carePlanConfigRepo.ts'), 'utf8');
const DRAWER_SRC = readFileSync(
  join(ROOT, 'components/careplan/drawers/WellnessWindowsDrawer.tsx'),
  'utf8',
);
const PATIENT_ID = 'default';

describe('F4 — wizard/drawer wellness write parity (Option A)', () => {
  // ── 1. Anti-duplication: ONE shared helper, no re-forked math ───────────────
  describe('contract 1: both surfaces call the SAME shared membership helper', () => {
    it('the repo helper (wizard path) imports + calls nextWellnessWindowMembership', () => {
      expect(REPO_SRC).toMatch(
        /import\s+\{[^}]*nextWellnessWindowMembership[^}]*\}\s+from\s+['"].*utils\/wellnessWindowMembership['"]/,
      );
      expect(REPO_SRC).toMatch(/nextWellnessWindowMembership\s*\(/);
      // The membership ternary must NOT be re-inlined in the repo.
      expect(REPO_SRC).not.toMatch(/filter\(\s*\(t\)\s*=>\s*t\s*!==\s*window\s*\)/);
    });

    it('the drawer (Care Plan path) imports + calls nextWellnessWindowMembership', () => {
      expect(DRAWER_SRC).toMatch(
        /import\s+\{[^}]*nextWellnessWindowMembership[^}]*\}\s+from\s+['"].*utils\/wellnessWindowMembership['"]/,
      );
      expect(DRAWER_SRC).toMatch(/nextWellnessWindowMembership\s*\(/);
      // The membership ternary must NOT be re-inlined in the drawer.
      expect(DRAWER_SRC).not.toMatch(/filter\(\s*\(t\)\s*=>\s*t\s*!==\s*period\s*\)/);
    });
  });

  // ── 2/3. timesOfDay parity — REAL repo write equals the helper result ───────
  describe('timesOfDay parity (wizard write === drawer helper result)', () => {
    beforeEach(async () => {
      await AsyncStorage.clear();
    });

    it('contract 2: morning-only — enabling morning from [] yields the same shape both surfaces compute', async () => {
      const cfg = await getOrCreateCarePlanConfig(PATIENT_ID);
      cfg.wellness.timesOfDay = [] as any;
      cfg.wellness.enabled = false;
      await saveCarePlanConfig(cfg);

      // Wizard path (real repo write).
      const afterWizard = await setWellnessWindowEnabled(PATIENT_ID, 'morning', true);
      // Drawer path (shared helper on the same starting state).
      const drawerResult = nextWellnessWindowMembership([], 'morning', true);

      expect(afterWizard.wellness.timesOfDay).toEqual(['morning']);
      expect(afterWizard.wellness.enabled).toBe(true);
      expect(afterWizard.wellness.timesOfDay).toEqual(drawerResult.timesOfDay);
      expect(afterWizard.wellness.enabled).toBe(drawerResult.enabled);
    });

    it('contract 3: morning+evening — enabling evening onto [morning] yields the same shape both surfaces compute', async () => {
      const cfg = await getOrCreateCarePlanConfig(PATIENT_ID);
      cfg.wellness.timesOfDay = ['morning'] as any;
      cfg.wellness.enabled = true;
      await saveCarePlanConfig(cfg);

      const afterWizard = await setWellnessWindowEnabled(PATIENT_ID, 'evening', true);
      const drawerResult = nextWellnessWindowMembership(['morning'], 'evening', true);

      expect(afterWizard.wellness.timesOfDay).toEqual(['morning', 'evening']);
      expect(afterWizard.wellness.enabled).toBe(true);
      expect(afterWizard.wellness.timesOfDay).toEqual(drawerResult.timesOfDay);
      expect(afterWizard.wellness.enabled).toBe(drawerResult.enabled);
    });
  });

  // ── 4. Legacy-period preservation (hide-not-delete) ─────────────────────────
  describe('contract 4: legacy period survives wizard window toggles', () => {
    beforeEach(async () => {
      await AsyncStorage.clear();
    });

    it('toggling morning OFF hide-not-deletes a stored midday + night value', async () => {
      const cfg = await getOrCreateCarePlanConfig(PATIENT_ID);
      cfg.wellness.timesOfDay = ['morning', 'midday', 'evening', 'night'] as any;
      cfg.wellness.enabled = true;
      await saveCarePlanConfig(cfg);

      const next = await setWellnessWindowEnabled(PATIENT_ID, 'morning', false);

      expect(next.wellness.timesOfDay).not.toContain('morning');
      expect(next.wellness.timesOfDay).toContain('midday');
      expect(next.wellness.timesOfDay).toContain('night');
      expect(next.wellness.timesOfDay).toContain('evening');
      // The shared helper computes the identical preservation.
      const drawerResult = nextWellnessWindowMembership(
        ['morning', 'midday', 'evening', 'night'],
        'morning',
        false,
      );
      expect(next.wellness.timesOfDay).toEqual(drawerResult.timesOfDay);
    });
  });
});
