// ============================================================================
// Phase 5.13.3 Stage 1 — Wizard → Now alignment reproduction.
//
// Background: post-wizard screenshots show the Now tab StatRings displaying
// MEDS / VITALS / WELLNESS / MEALS regardless of which template the user
// picked. With the General Wellness template (enables meals/water/wellness/
// sleep/activity, disables meds/vitals), Now still shows the original four.
// Sleep and activity also have no schedule presence on the timeline.
//
// Phase 5.13.2's orb wiring test pinned the event-emission chain
// (setBucketEnabled → saveCarePlanConfig → CARE_PLAN_CONFIG → hook reload).
// That chain works. What it does NOT pin is whether the data arriving at
// the rings reflects user selections, or whether sleep/activity become
// instances at all.
//
// This test pins four contracts. Stage 1 records the failure surface; the
// fix is Stage 2. No production change in this commit.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

// Reset AsyncStorage between tests so each contract starts from a clean slate.
const AsyncStorage = require('@react-native-async-storage/async-storage');

const ROOT = join(__dirname, '../..');
const PATIENT_ID = 'default';
const TEST_DATE = '2026-05-08';

beforeEach(async () => {
  if (AsyncStorage.__resetStore) AsyncStorage.__resetStore();
});

// Pull these inside the describe so they evaluate after jest.setup.js mocks land.
import { applyCarePlanTemplate } from '../../utils/applyCarePlanTemplate';
import { CARE_PLAN_TEMPLATES } from '../../constants/carePlanTemplates';
import {
  getCarePlanConfig,
  setBucketEnabled,
} from '../../storage/carePlanConfigRepo';
import { ensureDailyInstances } from '../../services/carePlanGenerator';

const generalWellness = CARE_PLAN_TEMPLATES.find((t) => t.id === 'general-wellness')!;

describe('Phase 5.13.3 — wizard → Now alignment (reproduction)', () => {
  // --------------------------------------------------------------------------
  // Contract 1 — applyCarePlanTemplate writes the correct enables.
  // --------------------------------------------------------------------------
  describe('Contract 1: applyCarePlanTemplate writes the correct enables', () => {
    it('General Wellness enables meals/water/wellness/sleep/activity and disables meds/vitals', async () => {
      await applyCarePlanTemplate(generalWellness, PATIENT_ID);
      const config = await getCarePlanConfig(PATIENT_ID);
      expect(config).not.toBeNull();
      // Enabled by the template.
      expect(config!.meals.enabled).toBe(true);
      expect(config!.water.enabled).toBe(true);
      expect(config!.wellness.enabled).toBe(true);
      expect(config!.sleep.enabled).toBe(true);
      expect(config!.activity.enabled).toBe(true);
      // Disabled by the template.
      expect(config!.meds.enabled).toBe(false);
      expect(config!.vitals.enabled).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Contract 2 — ensureDailyInstances covers sleep + activity.
  // --------------------------------------------------------------------------
  describe('Contract 2: ensureDailyInstances covers sleep + activity', () => {
    it('produces at least one sleep and one activity instance after applying General Wellness', async () => {
      await applyCarePlanTemplate(generalWellness, PATIENT_ID);
      const instances = await ensureDailyInstances(PATIENT_ID, TEST_DATE);
      const types = instances.map((i) => i.itemType);
      expect(types).toContain('sleep');
      expect(types).toContain('activity');
    });

    it('returns zero sleep/activity instances after toggling those buckets off', async () => {
      await applyCarePlanTemplate(generalWellness, PATIENT_ID);
      // Wizard-style toggle off via the same path Confirm uses.
      await setBucketEnabled(PATIENT_ID, 'sleep', false);
      await setBucketEnabled(PATIENT_ID, 'activity', false);
      const instances = await ensureDailyInstances(PATIENT_ID, TEST_DATE);
      const sleepInstances = instances.filter((i) => i.itemType === 'sleep');
      const activityInstances = instances.filter((i) => i.itemType === 'activity');
      expect(sleepInstances.length).toBe(0);
      expect(activityInstances.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Contract 3 — now.tsx reads water from the canonical schema path.
  // --------------------------------------------------------------------------
  describe('Contract 3: now.tsx water reads use the canonical schema path', () => {
    const nowSrc = readFileSync(join(ROOT, 'app/(tabs)/now.tsx'), 'utf8');

    it('does NOT use the non-existent .buckets?.water path', () => {
      // CarePlanConfig has water at the top level (config.water), not under
      // a .buckets sub-object. Reading off .buckets?.water always yields
      // undefined regardless of the actual config — which is why the water
      // tile and goal in Now never reflect what the wizard wrote.
      expect(nowSrc).not.toMatch(/\.buckets\?\.water\?\.enabled/);
      expect(nowSrc).not.toMatch(/\.buckets\?\.water\?\.dailyGoalGlasses/);
    });

    it('reads water enabled state via carePlanConfig?.water?.enabled', () => {
      expect(nowSrc).toMatch(/carePlanConfig\??\.water\??\.enabled/);
    });

    it('reads daily water goal via carePlanConfig?.water?.dailyGoalGlasses', () => {
      expect(nowSrc).toMatch(/carePlanConfig\??\.water\??\.dailyGoalGlasses/);
    });
  });

  // --------------------------------------------------------------------------
  // Contract 4 — StatRings does not hardcode its category list.
  // --------------------------------------------------------------------------
  describe('Contract 4: StatRings does not hardcode its category list', () => {
    const statRingsSrc = readFileSync(
      join(ROOT, 'components/now/StatRings.tsx'),
      'utf8',
    );

    it('has no module-level CATEGORIES array containing meds/vitals/wellness/meals as the sole render source', () => {
      // The defect: a fixed CATEGORIES array drives the four tiles regardless
      // of which buckets the wizard enabled. The fix replaces the static
      // array with a render derived from props.enabledBuckets (or the
      // todayStats keys) so users who picked General Wellness see
      // meals/water/wellness/sleep/activity instead of meds/vitals/wellness/meals.
      const arr = statRingsSrc.match(
        /const\s+CATEGORIES\s*[:=][^=]*=\s*\[([\s\S]*?)\]/,
      );
      // It's fine for a small constant to live in the file (e.g. emoji /
      // label lookup), but it must not be the four-item canonical list
      // that gates which tiles render.
      if (arr) {
        const body = arr[1];
        const hardcodesAllFour =
          /['"]meds['"]/.test(body) &&
          /['"]vitals['"]/.test(body) &&
          /['"]wellness['"]/.test(body) &&
          /['"]meals['"]/.test(body);
        expect(hardcodesAllFour).toBe(false);
      }
    });

    it('accepts an enabledBuckets prop so the consumer can drive which tiles render', () => {
      // The component's props interface must expose enabledBuckets so that
      // Now (which knows the active config) can pass it through.
      expect(statRingsSrc).toMatch(/enabledBuckets\s*\??:\s*BucketType\[\]/);
    });
  });

  // --------------------------------------------------------------------------
  // Contract 5 — Pre-Lock-3 cleanup Item A: StatRings orb row is hidden on
  // Now; wizard-designated buckets surface via the schedule/timeline.
  //
  // The orb row created the 7-into-6 cap conflict (StatRings slices
  // PRIORITY_ORDER at MAX_TRACKED_DIMENSIONS=6 → Activity, the 7th in
  // priority order, never rendered as an orb even when the wizard enabled
  // it). Rather than lift the cap and re-architect the row, we hide the
  // row for launch and let the schedule/timeline carry the bucket-surface
  // promise instead. Each wizard-designated bucket (Meals/Water/Sleep/
  // Activity/Wellness + core meds/vitals) produces DailyCareInstances via
  // ensureDailyInstances (already contracted in Contract 2) which
  // NowTimeline renders.
  //
  // Restore path: components/now/StatRings.tsx + its component tests
  // (StatRingsCapAt6, StatRingsHydrationRing, etc.) are preserved intact
  // for post-launch re-introduction once the cap question is resolved.
  // --------------------------------------------------------------------------
  describe('Contract 5: pre-Lock-3 Item A — StatRings orb row hidden; buckets surface via schedule', () => {
    const nowSrc = readFileSync(join(ROOT, 'app/(tabs)/now.tsx'), 'utf8');

    it('contract 5a: now.tsx does NOT render <StatRings> (orb row hidden)', () => {
      // Pin the absence of the JSX mount. The import of StatRings + the
      // component file itself stay (preservation; post-launch restore
      // path), but the render call must not appear.
      expect(nowSrc).not.toMatch(/<StatRings\b/);
    });

    it('contract 5b: now.tsx still mounts <NowTimeline> as the bucket-surface carrier', () => {
      // The schedule/timeline is what surfaces the wizard-designated
      // buckets in the post-orb world. Pin its mount so a future refactor
      // removing both StatRings and NowTimeline can't quietly leave the
      // Now tab with no bucket-surface.
      expect(nowSrc).toMatch(/<NowTimeline\b/);
    });

    it('contract 5c: ensureDailyInstances produces instances for the wizard-Now bucket set — meals/water/sleep/activity/wellness', async () => {
      // The orb-removal contract is "buckets surface through the schedule,
      // not orbs." Contract 2 covers sleep + activity; broaden here to the
      // full wizard-Now section (PRIMARY+SECONDARY minus CORE per the Lock 2
      // section split) so the schedule promise is pinned end-to-end.
      //
      // Core meds/vitals require explicit CarePlanItems (medication
      // entries), which the wizard's step-2 TemplateMedSeedingModal path
      // creates separately — out of scope for the bucket-surface contract.
      await applyCarePlanTemplate(generalWellness, PATIENT_ID);

      const instances = await ensureDailyInstances(PATIENT_ID, TEST_DATE);
      const types = new Set(instances.map((i) => i.itemType));

      // Now-tab wizard section (the 5 buckets the user sees in the
      // "These show on your Now tab" wizard section).
      expect(types.has('nutrition')).toBe(true); // meals
      expect(types.has('hydration')).toBe(true); // water
      expect(types.has('sleep')).toBe(true);
      expect(types.has('activity')).toBe(true);
      expect(types.has('wellness')).toBe(true);
    });

    it('contract 5d: StatRings.tsx file is preserved (post-launch restore path)', () => {
      // Hide-don't-delete contract. Removing the file would break the
      // bundled component tests (StatRingsCapAt6, statRingsHairlineGrouping,
      // statRingsFlattened, etc.) and lose the work it represents. Keep
      // the file + tests intact; remove only the mount on Now.
      expect(() =>
        readFileSync(join(ROOT, 'components/now/StatRings.tsx'), 'utf8'),
      ).not.toThrow();
    });
  });
});
