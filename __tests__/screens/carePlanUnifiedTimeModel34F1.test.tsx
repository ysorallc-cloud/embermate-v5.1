// ============================================================================
// Phase 34 F1 — unified time-model foundation.
//
// Every later feature in Phase 34 depends on three F1 invariants holding:
//
//   1. ONE canonical TIME_OF_DAY_DEFAULTS — types/carePlanConfig.ts is the
//      home. services/carePlanGenerator.ts imports it; no second copy.
//      (`custom: ''` per FLAG 2 lock — preserves the `|| fallback` chain
//      in the generator's `at:` field assembly.)
//
//   2. ONE shared resolver — every daily-instance generator path that
//      maps TimeOfDay → TimeWindowLabel goes through
//      services/carePlanGenerator.ts:TIME_OF_DAY_TO_WINDOW. Wellness is
//      the documented F2-bound exception (carePlanGenerator.ts:509-578
//      hardcodes three literal labels — F2 closes the bypass).
//
//   3. "Midday" retired as a user-facing label. The internal TimeOfDay
//      enum VALUE `'midday'` stays (FLAG 1 lock — no migration). Only
//      the displayed LABEL changes to "Afternoon" on live surfaces.
//      Two files exempt for this phase: app/medication-form.tsx (F6
//      retires it) and components/careplan/BucketCarePlanPanel.tsx
//      (orphan, no callers; dead-code sweep).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TIME_OF_DAY_DEFAULTS,
  TIME_OF_DAY_OPTIONS,
  type TimeOfDay,
} from '../../types/carePlanConfig';

const ROOT = join(__dirname, '../..');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

describe('Phase 34 F1 — unified time-model foundation', () => {
  // --------------------------------------------------------------------------
  // GROUP A — TIME_OF_DAY_DEFAULTS is de-duplicated; canonical home is the
  // types module; the generator imports from it.
  // --------------------------------------------------------------------------

  it('contract 1: TIME_OF_DAY_DEFAULTS lives in types/carePlanConfig.ts and exports the canonical shape', () => {
    expect(TIME_OF_DAY_DEFAULTS).toBeDefined();
    expect(TIME_OF_DAY_DEFAULTS.morning).toBe('08:00');
    expect(TIME_OF_DAY_DEFAULTS.midday).toBe('12:00');
    expect(TIME_OF_DAY_DEFAULTS.evening).toBe('18:00');
    expect(TIME_OF_DAY_DEFAULTS.night).toBe('21:00');
    // FLAG 2 lock — custom is the empty string (preserves the `||`
    // fall-through behavior in the generator's `at:` field assembly).
    expect(TIME_OF_DAY_DEFAULTS.custom).toBe('');
  });

  it('contract 2: services/carePlanGenerator.ts does NOT declare a duplicate TIME_OF_DAY_DEFAULTS const', () => {
    // The de-dupe target. Pre-F1 the generator carried its own
    // copy with a drifted `custom: '12:00'` value. Post-F1 the
    // generator IMPORTS the types-module canonical.
    const src = stripComments(
      readFileSync(join(ROOT, 'services/carePlanGenerator.ts'), 'utf8'),
    );
    // No local const declaration shaped like a TimeOfDay defaults map.
    expect(src).not.toMatch(/const\s+TIME_OF_DAY_DEFAULTS\s*:/);
    expect(src).not.toMatch(/const\s+TIME_OF_DAY_DEFAULTS\s*=/);
  });

  it('contract 3: services/carePlanGenerator.ts imports TIME_OF_DAY_DEFAULTS from the types module', () => {
    const src = stripComments(
      readFileSync(join(ROOT, 'services/carePlanGenerator.ts'), 'utf8'),
    );
    // Single-source import — the symbol must appear in an import
    // from the types module (or be re-exported from it). Accept
    // any import spec line that names TIME_OF_DAY_DEFAULTS coming
    // from a path ending in `types/carePlanConfig`.
    expect(src).toMatch(
      /import\s*\{[^}]*\bTIME_OF_DAY_DEFAULTS\b[^}]*\}\s*from\s*['"][^'"]*types\/carePlanConfig['"]/,
    );
  });

  // --------------------------------------------------------------------------
  // GROUP B — TIME_OF_DAY_TO_WINDOW is the one shared resolver. Every
  // generator path that maps TimeOfDay → TimeWindowLabel uses it. Wellness
  // is the documented F2-bound exception.
  // --------------------------------------------------------------------------

  it('contract 4: TIME_OF_DAY_TO_WINDOW lives in services/carePlanGenerator.ts as the single resolver', () => {
    const src = stripComments(
      readFileSync(join(ROOT, 'services/carePlanGenerator.ts'), 'utf8'),
    );
    // The map declaration + the canonical mapping (morning→morning,
    // midday→afternoon, evening→evening, night→night, custom→custom).
    expect(src).toMatch(/const\s+TIME_OF_DAY_TO_WINDOW\s*:\s*Record<TimeOfDay\s*,\s*TimeWindowLabel>/);
    // The midday→afternoon mapping is the user-visible bridge between
    // the Care Plan vocabulary and the Now-page vocabulary. Pin it
    // explicitly so a rename of either side breaks here, not at
    // runtime on the device.
    expect(src).toMatch(/midday\s*:\s*['"]afternoon['"]/);
  });

  it('contract 5: the generator uses TIME_OF_DAY_TO_WINDOW at every non-wellness call site (no inline literal TimeWindowLabel writes)', () => {
    // Scope of "every call site": each per-category sync block in
    // syncOtherBucketsWithConfig that builds a CarePlanItem.schedule
    // .times entry must derive its `label` from TIME_OF_DAY_TO_WINDOW.
    // F1 pins this for the non-wellness paths (meds, vitals, meals,
    // sleep, water, activity). Wellness is exempt — F2 closes the
    // bypass. We count `TIME_OF_DAY_TO_WINDOW[` lookups; pre-F1
    // these number 8 across the generator. Post-F1 we require ≥ 6
    // (the 6 non-wellness sync blocks call it ≥ once each).
    const src = stripComments(
      readFileSync(join(ROOT, 'services/carePlanGenerator.ts'), 'utf8'),
    );
    const lookups = src.match(/TIME_OF_DAY_TO_WINDOW\[/g) ?? [];
    expect(lookups.length).toBeGreaterThanOrEqual(6);
  });

  it('contract 6 (F2 DOCUMENTED EXCEPTION): the wellness sync block in the generator is the ONLY path with hardcoded TimeWindowLabel literals', () => {
    // Wellness sync (carePlanGenerator.ts:509-578) hardcodes three
    // labels: 'morning', 'afternoon', 'evening'. Pin its EXISTENCE
    // here so F1 doesn't pretend the bypass is closed — the F1
    // contract is exactly "this is the only bypass; F2 closes it."
    // Once F2 lands, this test FLIPS (contract becomes
    // `not.toMatch(...)` against the same hardcoded triple).
    const src = stripComments(
      readFileSync(join(ROOT, 'services/carePlanGenerator.ts'), 'utf8'),
    );
    // The three literal label lines inside the wellness sync block.
    // Use multi-line scan with the wellness anchor to scope.
    const wellnessIdx = src.search(/sync-wellness-morning/);
    expect(wellnessIdx).toBeGreaterThan(-1);
    // Window of 2500 chars around the anchor covers the three
    // hardcoded labels (morning at ~+11, afternoon at ~+1100,
    // evening at ~+550 in the stripped source).
    const window = src.slice(
      Math.max(0, wellnessIdx - 200),
      Math.min(src.length, wellnessIdx + 2500),
    );
    expect(window).toMatch(/label\s*:\s*['"]morning['"]/);
    expect(window).toMatch(/label\s*:\s*['"]afternoon['"]/);
    expect(window).toMatch(/label\s*:\s*['"]evening['"]/);
  });

  // --------------------------------------------------------------------------
  // GROUP C — "Midday" retired as a user-facing label; internal enum
  // value `'midday'` is unchanged.
  // --------------------------------------------------------------------------

  it('contract 7 (FLAG 1 — no migration): TimeOfDay enum value `\'midday\'` is preserved (internal storage key unchanged)', () => {
    // Stored data uses the key `'midday'` across every category.
    // Renaming the value would force a migration on every stored
    // med / meal / water / sleep / activity row. F1 only changes
    // user-facing LABELS; the type union retains `'midday'`.
    const midday: TimeOfDay = 'midday';
    expect(midday).toBe('midday');
    expect(TIME_OF_DAY_DEFAULTS['midday']).toBe('12:00');
  });

  it('contract 8: TIME_OF_DAY_OPTIONS midday entry shows "Afternoon" as its user-facing label (retired "Midday")', () => {
    const midday = TIME_OF_DAY_OPTIONS.find((o) => o.value === 'midday');
    expect(midday).toBeDefined();
    expect(midday!.label).toBe('Afternoon');
    // Value is the stable key — must NOT have been renamed.
    expect(midday!.value).toBe('midday');
  });

  it('contract 9: MedicationsDrawer QUICK_ADD_TIME_SLOTS midday label is "Afternoon" and time is "12:00" (drift fix)', () => {
    // Pre-F1: label 'Midday', time '13:00'. The 13:00 was a third
    // place hardcoding a time and disagreed with the canonical
    // 12:00 in TIME_OF_DAY_DEFAULTS. F1 retires both label and
    // time drift while it's in scope.
    const src = stripComments(
      readFileSync(
        join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx'),
        'utf8',
      ),
    );
    // The QUICK_ADD_TIME_SLOTS midday entry — both label + time
    // pinned on one line.
    expect(src).toMatch(/value\s*:\s*['"]midday['"]\s*,\s*label\s*:\s*['"]Afternoon['"]\s*,\s*time\s*:\s*['"]12:00['"]/);
    // Hard reject of the pre-F1 strings.
    expect(src).not.toMatch(/value\s*:\s*['"]midday['"][^}]*label\s*:\s*['"]Midday['"]/);
    expect(src).not.toMatch(/value\s*:\s*['"]midday['"][^}]*time\s*:\s*['"]13:00['"]/);
  });

  it('contract 10: MedicationsDrawer MEDS_TIME_LABEL.midday is "Afternoon" (per-med row display label)', () => {
    const src = stripComments(
      readFileSync(
        join(ROOT, 'components/careplan/drawers/MedicationsDrawer.tsx'),
        'utf8',
      ),
    );
    // The MEDS_TIME_LABEL map entry for midday.
    expect(src).toMatch(/midday\s*:\s*['"]Afternoon['"]/);
    expect(src).not.toMatch(/midday\s*:\s*['"]Midday['"]/);
  });

  it('contract 11: no live Care Plan / Now surface renders the user-facing string "Midday" (exempt: app/medication-form.tsx pending F6 retire, BucketCarePlanPanel.tsx orphan)', () => {
    // Single-quote, double-quote, and template-literal forms — all
    // rejected. Scope-limited to live surfaces; two files are
    // documented exempt for this phase:
    //   • app/medication-form.tsx — F6 retires it; chasing a
    //     retiring file is wasted churn.
    //   • components/careplan/BucketCarePlanPanel.tsx — orphan,
    //     zero callers (grep-confirmed); dead-code sweep.
    const liveSurfaces = [
      'types/carePlanConfig.ts',
      'components/careplan/drawers/MedicationsDrawer.tsx',
      'components/careplan/drawers/MealsDrawer.tsx',
      'components/careplan/drawers/VitalsDrawer.tsx',
      'components/careplan/drawers/WellnessDrawer.tsx',
      'components/careplan/drawers/WaterDrawer.tsx',
      'components/careplan/drawers/SleepDrawer.tsx',
      'components/careplan/drawers/ActivityDrawer.tsx',
      'app/care-plan/index.tsx',
      'app/(tabs)/now.tsx',
    ];
    const midPattern = /['"`]Midday['"`]/;
    for (const rel of liveSurfaces) {
      const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
      expect({ rel, hasMidday: midPattern.test(src) }).toEqual({
        rel,
        hasMidday: false,
      });
    }
  });
});
