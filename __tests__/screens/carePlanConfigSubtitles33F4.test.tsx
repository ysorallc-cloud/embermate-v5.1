// ============================================================================
// Phase 33 F4 — config subtitles on enabled Care Plan rows.
//
// Read-only — every enabled row pulls its config from existing state
// into a subtitle. No data writes, no new fields, no fabrication.
//
// User-locked scope (2026-05-26):
//   • Wellness  → check-in cadence ("Morning + evening check-in", etc.)
//   • Vitals    → which vitals tracked, if enabled         (ALREADY LIVE)
//   • Sleep     → "Tracked morning"                         (ALREADY LIVE)
//   • Activity  → "Tracked evening"                         (ALREADY LIVE)
//   • Meals/Water → leave existing subtitles as-is          (ALREADY LIVE)
//
// Gap closed by F4: wellness was the only row in scope whose
// getBucketStatusText fell through to the default → null branch.
// All other in-scope rows already render subtitles correctly.
//
// Architecture: wellness cadence lives in @embermate_wellness_settings
// (P5 bridge — separate from CarePlanConfig). A pure helper
// `getWellnessCadenceText(settings)` lives in utils/, and
// app/care-plan/index.tsx composes it with the existing
// getBucketStatus(bucket) router via a local `getBucketDetail`
// wrapper. The wrapper is the single source of truth for "what
// subtitle does this row show?" — wellness reads the cadence helper,
// every other bucket falls through to getBucketStatus.
//
// User lock: "If a category is ON but has no meaningful config yet,
// show nothing rather than a placeholder — don't invent text." The
// helper returns null when wellness is on but BOTH periods are
// disabled (the only no-meaningful-config wellness state).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { getWellnessCadenceText } from '../../utils/wellnessCadenceText';
import type { WellnessSettings } from '../../types/wellnessSettings';
import { DEFAULT_WELLNESS_SETTINGS } from '../../types/wellnessSettings';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STRIPPED = stripComments(INDEX_SRC);

function withPeriods(morning: boolean, evening: boolean): WellnessSettings {
  return {
    ...DEFAULT_WELLNESS_SETTINGS,
    morning: { ...DEFAULT_WELLNESS_SETTINGS.morning, enabled: morning },
    evening: { ...DEFAULT_WELLNESS_SETTINGS.evening, enabled: evening },
  };
}

describe('Phase 33 F4 — config subtitles on enabled Care Plan rows (F3.1 reframed)', () => {
  // --------------------------------------------------------------------------
  // GROUP A — wellness cadence helper.
  //
  // Phase 34 F3.1 REFRAME: the helper signature changed from
  // `(settings: WellnessSettings | null | undefined)` to
  // `(timesOfDay: TimeOfDay[] | null | undefined)`. Full behavior
  // pins live in __tests__/screens/wellnessChipsToCarePlanConfig
  // 34F3_1.test.tsx (contracts 1-5). Phase 33 F4's original
  // signature contracts are SUBSUMED there — kept here as a
  // single delegation pin so a future maintainer reading this
  // file sees where the live coverage lives.
  // --------------------------------------------------------------------------

  it('contract 1-5 (F3.1 REFRAME — SUBSUMED): helper signature + behavior pinned in wellnessChipsToCarePlanConfig34F3_1.test.tsx', () => {
    // The F3.1 swap retired the P5-based signature this group
    // originally pinned. New shape: `getWellnessCadenceText(
    // timesOfDay: TimeOfDay[] | null | undefined)`. Sanity-pin
    // the helper still exists and returns string|null; full
    // behavior coverage lives in the F3.1 file.
    expect(typeof getWellnessCadenceText).toBe('function');
    expect(getWellnessCadenceText(null as any)).toBeNull();
    expect(getWellnessCadenceText(undefined as any)).toBeNull();
  });

  // --------------------------------------------------------------------------
  // GROUP B — wire-up in app/care-plan/index.tsx (source-level pins).
  // --------------------------------------------------------------------------

  it('contract 6: care-plan/index.tsx imports getWellnessCadenceText', () => {
    expect(STRIPPED).toMatch(/import\s*\{\s*getWellnessCadenceText\s*\}\s*from\s*['"][^'"]*wellnessCadenceText['"]/);
  });

  it('contract 7 (F3.1 REFRAME): care-plan/index.tsx reads carePlanConfig — NOT the P5 useWellnessSettings hook — for the wellness cadence subtitle', () => {
    // Pre-F3.1 the home read useWellnessSettings (P5 store) so
    // the helper could consume morning.enabled + evening.enabled.
    // F3.1 swapped the helper signature to take TimeOfDay[]
    // directly; the home now reads carePlanConfig.wellness
    // .timesOfDay. P5 useWellnessSettings import + hook call
    // retired from this file. (The drawer still uses the P5
    // store for the WHAT layer — separate concern.)
    expect(STRIPPED).not.toMatch(/import\s*\{[^}]*\buseWellnessSettings\b[^}]*\}\s*from/);
    expect(STRIPPED).not.toMatch(/\buseWellnessSettings\s*\(/);
    // useCarePlanConfig stays — the home reads the carePlanConfig
    // for the wellness bucket.
    expect(STRIPPED).toMatch(/useCarePlanConfig\s*\(\s*\)/);
  });

  it('contract 8 (F3.1 REFRAME): getBucketDetail wellness branch passes timesOfDay to the helper (NOT the P5 settings object)', () => {
    // Wrapper still routes wellness → cadence helper; argument
    // shape swapped from P5 settings to TimeOfDay[]. Pin the
    // new shape; reject the old.
    expect(STRIPPED).toMatch(/\bgetBucketDetail\b/);
    expect(STRIPPED).toMatch(/bucket\s*===\s*['"]wellness['"][\s\S]{0,200}getWellnessCadenceText/);
    // The call argument now reaches into config?.wellness?.timesOfDay
    // (or equivalent). Pin literal `.timesOfDay` in the helper
    // call site's argument.
    expect(STRIPPED).toMatch(/getWellnessCadenceText\s*\(\s*[^)]*\.timesOfDay/);
    // Hard reject of the pre-F3.1 P5 settings argument shape.
    expect(STRIPPED).not.toMatch(/getWellnessCadenceText\s*\(\s*wellnessSettings\s*\)/);
  });

  it('contract 9: CategoryRow detail prop now reads from getBucketDetail (not getBucketStatus directly)', () => {
    // Both CategoryRow.detail prop call sites (DAILY_TRACKING_BUCKETS
    // map + ADD_WHEN_READY_BUCKETS map) must route through the
    // wrapper so the wellness override takes effect on the wellness
    // row in DAILY_TRACKING_BUCKETS.
    const detailProps = STRIPPED.match(/detail=\{[^}]*getBucketDetail\([^)]*\)[^}]*\}/g) ?? [];
    expect(detailProps.length).toBeGreaterThanOrEqual(2);
  });

  // --------------------------------------------------------------------------
  // GROUP C — already-live subtitles unchanged (regression pins).
  //
  // F4 must not silently change the meals / water / sleep / activity /
  // vitals / meds subtitles that already work. Re-prove the
  // getBucketStatusText branches for those bucket types are intact.
  // --------------------------------------------------------------------------

  it('contract 10 (REGRESSION): existing getBucketStatusText branches intact (vitals/sleep/activity/meals/water/meds)', () => {
    const TYPES_SRC = readFileSync(
      join(ROOT, 'types/carePlanConfig.ts'),
      'utf8',
    );
    const TYPES_STRIPPED = stripComments(TYPES_SRC);
    for (const c of ['meds', 'vitals', 'meals', 'water', 'sleep', 'activity']) {
      expect(TYPES_STRIPPED).toMatch(new RegExp(`case\\s+['"]${c}['"]\\s*:`));
    }
  });

  // --------------------------------------------------------------------------
  // GROUP D — OFF rows show no subtitle (user lock).
  // --------------------------------------------------------------------------

  it('contract 11 (OFF rows): CategoryRow detail prop is gated on isEnabled (off rows show null)', () => {
    // The pre-F4 shape `detail={isEnabled ? ... : null}` survives —
    // off rows continue to show no subtitle regardless of the
    // wrapper. Pin the gate so a future refactor that drops it
    // (e.g. "always show config even when off") gets caught here.
    expect(STRIPPED).toMatch(/detail=\{isEnabled\s*\?\s*getBucketDetail\([^)]*\)\s*:\s*null\}/);
  });
});
