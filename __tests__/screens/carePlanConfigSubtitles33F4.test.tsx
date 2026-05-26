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

describe('Phase 33 F4 — config subtitles on enabled Care Plan rows', () => {
  // --------------------------------------------------------------------------
  // GROUP A — wellness cadence helper (the only NEW logic in F4).
  // --------------------------------------------------------------------------

  it('contract 1: both periods enabled → "Morning + evening check-in"', () => {
    expect(getWellnessCadenceText(withPeriods(true, true))).toBe('Morning + evening check-in');
  });

  it('contract 2: morning only → "Morning check-in"', () => {
    expect(getWellnessCadenceText(withPeriods(true, false))).toBe('Morning check-in');
  });

  it('contract 3: evening only → "Evening check-in"', () => {
    expect(getWellnessCadenceText(withPeriods(false, true))).toBe('Evening check-in');
  });

  it('contract 4 (DO NOT INVENT): neither period enabled → null (no fabricated subtitle)', () => {
    // User lock: "If a category is ON but has no meaningful config
    // yet, show nothing rather than a placeholder — don't invent
    // text." A wellness row that's toggled on but where both
    // periods got disabled in the drawer has no meaningful cadence;
    // helper returns null and the row renders no subtitle.
    expect(getWellnessCadenceText(withPeriods(false, false))).toBeNull();
  });

  it('contract 5 (DO NOT INVENT): missing settings → null', () => {
    // Defensive — if the wellness store hasn't loaded yet (null
    // settings), the helper returns null rather than throwing or
    // inventing copy.
    expect(getWellnessCadenceText(null)).toBeNull();
    expect(getWellnessCadenceText(undefined)).toBeNull();
  });

  // --------------------------------------------------------------------------
  // GROUP B — wire-up in app/care-plan/index.tsx (source-level pins).
  // --------------------------------------------------------------------------

  it('contract 6: care-plan/index.tsx imports getWellnessCadenceText', () => {
    expect(STRIPPED).toMatch(/import\s*\{\s*getWellnessCadenceText\s*\}\s*from\s*['"][^'"]*wellnessCadenceText['"]/);
  });

  it('contract 7: care-plan/index.tsx reads wellness settings via useWellnessSettings', () => {
    // The cadence helper takes WellnessSettings; care-plan/index.tsx
    // needs access to that store. The hook is the canonical reader
    // (P5 bridge); pin its import + use.
    expect(STRIPPED).toMatch(/import\s*\{\s*useWellnessSettings\s*\}\s*from\s*['"][^'"]*useWellnessSettings['"]/);
    expect(STRIPPED).toMatch(/useWellnessSettings\s*\(\s*\)/);
  });

  it('contract 8: getBucketDetail wrapper exists and routes wellness → cadence helper, others → getBucketStatus', () => {
    // Single source of truth for "what subtitle does this row show?"
    // — wraps getBucketStatus(bucket) with a wellness override that
    // calls getWellnessCadenceText. Pin the wrapper's existence and
    // the wellness routing.
    expect(STRIPPED).toMatch(/\bgetBucketDetail\b/);
    // The wellness branch invokes the cadence helper with the
    // settings shape.
    expect(STRIPPED).toMatch(/bucket\s*===\s*['"]wellness['"][\s\S]{0,200}getWellnessCadenceText/);
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
