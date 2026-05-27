// ============================================================================
// Phase 34 F3.1 — close the dual-store divergence. Wellness chips read +
// write carePlanConfig.wellness.timesOfDay (the source of truth the F2/F3
// generator reads). P5 wellnessSettings.{period}.enabled becomes legacy/
// inert at the WHEN layer (hide-not-delete; preserved in storage, no
// reader or writer).
//
// Walk failure that prompted this:
//   "Toggling Morning chip off does NOT stop morning generation
//    (chip writes to P5 enabled, generation reads timesOfDay).
//    No Afternoon or Night chip exists, so the caregiver can't
//    configure those windows even though timesOfDay supports them."
//
// Same "control doesn't control" pattern F2 + F3 just closed; pulled
// forward from F5 so it doesn't ship visible while F4 runs.
//
// SCOPE — three swaps:
//   • WellnessDrawer CHECK-IN TIMES chips read/write
//     carePlanConfig.wellness.timesOfDay via useCarePlanConfig +
//     updateBucket('wellness', { timesOfDay: ... }). All four canonical
//     windows present (morning / midday / evening / night). Plain
//     window labels (user-locked option (b)).
//   • utils/wellnessCadenceText.ts signature changes:
//       getWellnessCadenceText(timesOfDay: TimeOfDay[] | null | undefined)
//     Returns text reflecting all four windows.
//   • app/care-plan/index.tsx passes wellnessConfig.timesOfDay to the
//     helper (not P5 wellnessSettings). useWellnessSettings import +
//     hook call retired from this file (drawer still uses it for the
//     WHAT layer — checks/optionalChecks/reminderEnabled — unchanged).
//
// HIDE-NOT-DELETE:
//   wellnessSettings.{morning,afternoon,evening}.enabled remains in
//   storage. After F3.1 nothing reads or writes those fields. Pinned
//   below.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { getWellnessCadenceText } from '../../utils/wellnessCadenceText';
import type { TimeOfDay } from '../../types/carePlanConfig';

const ROOT = join(__dirname, '../..');
const DRAWER_SRC = readFileSync(
  join(ROOT, 'components/careplan/drawers/WellnessDrawer.tsx'),
  'utf8',
);
const HOME_SRC = readFileSync(
  join(ROOT, 'app/care-plan/index.tsx'),
  'utf8',
);
const HELPER_SRC = readFileSync(
  join(ROOT, 'utils/wellnessCadenceText.ts'),
  'utf8',
);

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const DRAWER_STRIPPED = stripComments(DRAWER_SRC);
const HOME_STRIPPED = stripComments(HOME_SRC);
const HELPER_STRIPPED = stripComments(HELPER_SRC);

describe('Phase 34 F3.1 — wellness chips read + write carePlanConfig.timesOfDay (P5 enabled retired)', () => {
  // --------------------------------------------------------------------------
  // GROUP A — cadence helper behavior post-swap.
  //
  // Signature changes from `(settings: WellnessSettings | null | undefined)`
  // to `(timesOfDay: TimeOfDay[] | null | undefined)`. Returns text
  // reflecting all four canonical windows.
  // --------------------------------------------------------------------------

  it('contract 1: helper accepts TimeOfDay[] and returns text for all four canonical windows', () => {
    expect(getWellnessCadenceText(['morning', 'midday', 'evening', 'night'] as TimeOfDay[]))
      .toBe('Morning + afternoon + evening + night check-in');
  });

  it('contract 2: morning + evening → "Morning + evening check-in" (continuity with the prior 2-period output)', () => {
    expect(getWellnessCadenceText(['morning', 'evening'] as TimeOfDay[]))
      .toBe('Morning + evening check-in');
  });

  it('contract 3: single window → "<Window> check-in"', () => {
    expect(getWellnessCadenceText(['morning'] as TimeOfDay[])).toBe('Morning check-in');
    expect(getWellnessCadenceText(['midday'] as TimeOfDay[])).toBe('Afternoon check-in');
    expect(getWellnessCadenceText(['evening'] as TimeOfDay[])).toBe('Evening check-in');
    expect(getWellnessCadenceText(['night'] as TimeOfDay[])).toBe('Night check-in');
  });

  it('contract 4 (DO NOT INVENT): empty array → null', () => {
    expect(getWellnessCadenceText([] as TimeOfDay[])).toBeNull();
  });

  it('contract 5 (DO NOT INVENT): null / undefined → null', () => {
    expect(getWellnessCadenceText(null)).toBeNull();
    expect(getWellnessCadenceText(undefined)).toBeNull();
  });

  // --------------------------------------------------------------------------
  // GROUP B — helper source — no longer reads P5 store.
  // --------------------------------------------------------------------------

  it('contract 6: helper imports TimeOfDay (NOT WellnessSettings) and no longer reads .enabled', () => {
    expect(HELPER_STRIPPED).toMatch(/import\s+type\s+\{\s*TimeOfDay\s*\}\s+from\s+['"][^'"]*types\/carePlanConfig['"]/);
    expect(HELPER_STRIPPED).not.toMatch(/import\s+type\s+\{\s*WellnessSettings\s*\}/);
    // Helper body reads from the TimeOfDay array, not from a
    // settings.{period}.enabled tree.
    expect(HELPER_STRIPPED).not.toMatch(/\.enabled\s*===\s*true/);
    expect(HELPER_STRIPPED).not.toMatch(/\.morning\?\.enabled/);
    expect(HELPER_STRIPPED).not.toMatch(/\.evening\?\.enabled/);
  });

  // --------------------------------------------------------------------------
  // GROUP C — WellnessDrawer chip swap (reads + writes carePlanConfig).
  // --------------------------------------------------------------------------

  it('contract 7: WellnessDrawer renders FOUR check-in-time chips (morning, midday, evening, night)', () => {
    // Pre-F3.1 the CHECK-IN TIMES row mapped over `['morning',
    // 'evening']`. Post-F3.1 it maps over all four canonical
    // windows. Pin the literal array shape.
    expect(DRAWER_STRIPPED).toMatch(
      /\[\s*['"]morning['"]\s*,\s*['"]midday['"]\s*,\s*['"]evening['"]\s*,\s*['"]night['"]\s*\]/,
    );
    // The pre-F3.1 two-window literal is GONE.
    expect(DRAWER_STRIPPED).not.toMatch(
      /\[\s*['"]morning['"]\s*,\s*['"]evening['"]\s*\]\s*as\s+const/,
    );
  });

  it('contract 8: WellnessDrawer imports useCarePlanConfig (the source-of-truth store)', () => {
    expect(DRAWER_STRIPPED).toMatch(/import\s*\{[^}]*\buseCarePlanConfig\b[^}]*\}\s*from\s*['"][^'"]*useCarePlanConfig['"]/);
  });

  it('contract 9: chip onPress writes via updateBucket(\'wellness\', { timesOfDay: ... }) — NOT updateSettings to P5', () => {
    // The new write path uses updateBucket from useCarePlanConfig.
    // Hard reject the pre-F3.1 togglePeriodEnabled function name
    // (it wrote to P5 — retired).
    expect(DRAWER_STRIPPED).toMatch(/updateBucket\s*\(\s*['"]wellness['"]\s*,\s*\{\s*timesOfDay\s*:/);
    expect(DRAWER_STRIPPED).not.toMatch(/const\s+togglePeriodEnabled\s*=/);
  });

  it('contract 10: chip render derives isOn from timesOfDay.includes(...) — NOT settings[period].enabled', () => {
    // Pin the new read path + reject the old one (settings[period].enabled
    // was the bug — chip toggled but generation never saw it). The
    // case-flexible `[Tt]imesOfDay` boundary accepts either a
    // top-level `timesOfDay` variable or a derived name like
    // `wellnessTimesOfDay` — both are valid expressions of the
    // same read; the contract is about the access pattern, not
    // the variable name.
    expect(DRAWER_STRIPPED).toMatch(/[Tt]imesOfDay\??\.includes\s*\(/);
    expect(DRAWER_STRIPPED).not.toMatch(/settings\[\s*period\s*\]\.enabled/);
  });

  it('contract 11: chip labels are plain window names (user-locked option (b)) — no time suffix', () => {
    // Pre-F3.1 the chip label was "Morning · 7 AM" (window · time).
    // Post-F3.1 labels are just the window name. The label text
    // comes from TIME_OF_DAY_OPTIONS (F1 already renamed midday →
    // 'Afternoon'). Pin absence of the time-suffix pattern in the
    // chip render.
    const chipRowIdx = DRAWER_STRIPPED.search(/CHECK-IN TIMES/);
    expect(chipRowIdx).toBeGreaterThan(-1);
    // 1500-char window after CHECK-IN TIMES anchor covers the
    // chip render block.
    const window = DRAWER_STRIPPED.slice(
      chipRowIdx,
      Math.min(DRAWER_STRIPPED.length, chipRowIdx + 1500),
    );
    // No timeLabel(...) call in the chip render — that was the
    // time-formatting helper for the "· 7 AM" suffix.
    expect(window).not.toMatch(/\$\{[^}]*timeLabel\s*\(/);
    expect(window).not.toMatch(/\s·\s\$\{[^}]*\.time/);
  });

  // --------------------------------------------------------------------------
  // GROUP D — care-plan/index.tsx home-screen wire-up.
  // --------------------------------------------------------------------------

  it('contract 12: care-plan/index.tsx passes timesOfDay (NOT wellnessSettings) to getWellnessCadenceText', () => {
    // The wellness branch of getBucketDetail now passes
    // wellnessConfig.timesOfDay (or equivalent reach into the
    // carePlanConfig.wellness bucket) to the helper.
    expect(HOME_STRIPPED).toMatch(
      /getWellnessCadenceText\s*\(\s*[^)]*\.timesOfDay/,
    );
    // The pre-F3.1 helper call took the P5 settings object —
    // explicitly reject that argument shape.
    expect(HOME_STRIPPED).not.toMatch(/getWellnessCadenceText\s*\(\s*wellnessSettings\s*\)/);
  });

  it('contract 13: care-plan/index.tsx no longer imports useWellnessSettings (drawer still uses it for the WHAT layer; home does not)', () => {
    // After F3.1, the home screen's only use of the P5 store was
    // the cadence subtitle. That moves to carePlanConfig. The
    // useWellnessSettings import + hook call should be retired
    // from this file. (The drawer still uses it for checks /
    // optionalChecks / reminderEnabled — those are the WHAT
    // layer, unchanged by F3.1.)
    expect(HOME_STRIPPED).not.toMatch(/import\s*\{[^}]*\buseWellnessSettings\b[^}]*\}\s*from/);
    expect(HOME_STRIPPED).not.toMatch(/\buseWellnessSettings\s*\(/);
  });

  // --------------------------------------------------------------------------
  // GROUP E — HIDE-NOT-DELETE: P5 enabled is preserved, no longer
  // touched anywhere in the post-F3.1 code paths.
  // --------------------------------------------------------------------------

  it('contract 14 (HIDE-NOT-DELETE): drawer does NOT write settings[period].enabled anywhere', () => {
    // The pre-F3.1 togglePeriodEnabled wrote `[period].enabled`
    // in the P5 settings spread. Post-F3.1 no code path writes
    // .enabled for any period — the field is legacy/inert.
    expect(DRAWER_STRIPPED).not.toMatch(/\benabled\s*:\s*!settings\s*\[\s*period\s*\]\.enabled/);
    expect(DRAWER_STRIPPED).not.toMatch(/\benabled\s*:\s*!settings\.morning\.enabled/);
    expect(DRAWER_STRIPPED).not.toMatch(/\benabled\s*:\s*!settings\.evening\.enabled/);
  });

  it('contract 15 (HIDE-NOT-DELETE): drawer does NOT read settings[period].enabled anywhere', () => {
    // Same field, read side. The chip is\'s "isOn" derives from
    // timesOfDay, not from .enabled.
    expect(DRAWER_STRIPPED).not.toMatch(/settings\s*\[\s*period\s*\]\.enabled/);
    expect(DRAWER_STRIPPED).not.toMatch(/settings\.morning\.enabled/);
    expect(DRAWER_STRIPPED).not.toMatch(/settings\.evening\.enabled/);
    expect(DRAWER_STRIPPED).not.toMatch(/settings\.afternoon\.enabled/);
  });

  it('contract 16 (HIDE-NOT-DELETE): wellnessCadenceText does NOT touch .enabled either', () => {
    expect(HELPER_STRIPPED).not.toMatch(/\.morning\?\.enabled/);
    expect(HELPER_STRIPPED).not.toMatch(/\.evening\?\.enabled/);
    expect(HELPER_STRIPPED).not.toMatch(/\.afternoon\?\.enabled/);
  });

  // --------------------------------------------------------------------------
  // GROUP F — WHAT layer (checks / optionalChecks / reminderEnabled)
  // UNCHANGED. F3.1 only touches WHEN.
  // --------------------------------------------------------------------------

  it('contract 17 (WHAT UNCHANGED): drawer still imports + uses useWellnessSettings for the WHAT layer (checks / optionalChecks / reminderEnabled)', () => {
    // Drawer keeps useWellnessSettings — the morning/evening
    // TRACK chips + reminder Switches still read/write checks +
    // optionalChecks + reminderEnabled to the P5 store. F3.1
    // only swaps the WHEN (timesOfDay) source of truth.
    expect(DRAWER_STRIPPED).toMatch(/useWellnessSettings\s*\(\s*\)/);
    // The TRACK chips still use renderChip + fieldSelected
    // (reads checks / optionalChecks).
    expect(DRAWER_STRIPPED).toMatch(/fieldSelected\s*\(/);
    expect(DRAWER_STRIPPED).toMatch(/renderChip\s*\(/);
  });
});
