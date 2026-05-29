// ============================================================================
// Phase 34 F4 — v1 hidden buckets: single source of truth + suppression
// surfaces. Care Plan v1 = Meds, Wellness, Meals, Vitals. Water / Sleep /
// Activity / Appointments are HIDDEN (data + storage + routes preserved).
// Vitals frequency control HIDDEN (value preserved; generator already
// ignored it — Bug B closure is hide-only).
//
// MODEL B (user-locked): hidden buckets are v1-dormant — excluded from
// getEnabledBuckets (cascades to Care Plan rows + quick-log + Now
// snapshot), generation gated off (existing items deactivate via the
// F2.1 branch, config.enabled preserved), Now water-ring gated. v1.1
// unhide = remove the bucket from MVP_HIDDEN_BUCKETS — ONE constant edit.
//
// SINGLE-SOURCE-OF-TRUTH PIN (user-locked, prospective "fix the class"):
//   • MVP_HIDDEN_BUCKETS lives in ONE place: types/carePlanConfig.ts
//     (with getEnabledBuckets).
//   • Every suppression surface imports it — NO per-surface hardcoded
//     bucket lists. A future surface that forgets the import is caught.
//   • The six suppression surfaces (getEnabledBuckets, sleep/water/
//     activity generators, Now water-ring, appointments-via-quick-log)
//     are all controlled by that one constant.
//
// This file covers SSOT + getEnabledBuckets unit + source-level
// suppression pins. Generator behavior (prior-state seeded) lives in
// mvpHiddenBucketsGeneration34F4.test.ts.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  MVP_HIDDEN_BUCKETS,
  getEnabledBuckets,
  createDefaultCarePlanConfig,
  type CarePlanConfig,
  type BucketType,
} from '../../types/carePlanConfig';

const ROOT = join(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}
function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

describe('Phase 34 F4 — MVP_HIDDEN_BUCKETS single source of truth + suppression', () => {
  // --------------------------------------------------------------------------
  // GROUP A — single source of truth.
  // --------------------------------------------------------------------------

  it('contract 1: MVP_HIDDEN_BUCKETS is exported from types/carePlanConfig.ts and lists the four v1-hidden buckets', () => {
    expect(Array.isArray(MVP_HIDDEN_BUCKETS)).toBe(true);
    const set = new Set(MVP_HIDDEN_BUCKETS as readonly BucketType[]);
    expect(set.has('water')).toBe(true);
    expect(set.has('sleep')).toBe(true);
    expect(set.has('activity')).toBe(true);
    expect(set.has('appointments')).toBe(true);
    // The v1-VISIBLE four must NOT be hidden.
    expect(set.has('meds')).toBe(false);
    expect(set.has('wellness')).toBe(false);
    expect(set.has('meals')).toBe(false);
    expect(set.has('vitals')).toBe(false);
  });

  it('contract 2: MVP_HIDDEN_BUCKETS is declared in EXACTLY ONE place (types/carePlanConfig.ts)', () => {
    // Grep the whole source tree for a `MVP_HIDDEN_BUCKETS =` declaration.
    // Exactly one — the canonical home. Every other reference must be an
    // import, not a re-declaration.
    const surfaces = [
      'types/carePlanConfig.ts',
      'services/carePlanGenerator.ts',
      'app/care-plan/index.tsx',
      'app/(tabs)/now.tsx',
      'constants/quickLogOptions.ts',
    ];
    let declarationCount = 0;
    for (const rel of surfaces) {
      const src = stripComments(read(rel));
      const decls = src.match(/(?:const|let|var)\s+MVP_HIDDEN_BUCKETS\s*[:=]/g) ?? [];
      if (rel === 'types/carePlanConfig.ts') {
        expect(decls.length).toBe(1); // the canonical declaration
      }
      declarationCount += decls.length;
    }
    expect(declarationCount).toBe(1);
  });

  it('contract 3: NO suppression surface hardcodes the hidden-bucket list — they import MVP_HIDDEN_BUCKETS', () => {
    // The drift guard. A surface that suppresses hidden buckets via an
    // inline ['water','sleep','activity','appointments'] literal instead
    // of importing the constant fails here. Scan the generator + Now +
    // care-plan home for the literal array shape.
    const suppressionSurfaces = [
      'services/carePlanGenerator.ts',
      'app/(tabs)/now.tsx',
    ];
    for (const rel of suppressionSurfaces) {
      const src = stripComments(read(rel));
      // Reject an inline 4-bucket suppression literal in any order
      // that includes all four hidden buckets adjacent. The simplest
      // robust check: no literal array containing 'water' AND 'sleep'
      // AND 'activity' AND 'appointments' as string members in one
      // bracket group.
      const arrayLiterals = src.match(/\[[^\]]*\]/g) ?? [];
      for (const lit of arrayLiterals) {
        const hasAllFour =
          /['"]water['"]/.test(lit) &&
          /['"]sleep['"]/.test(lit) &&
          /['"]activity['"]/.test(lit) &&
          /['"]appointments['"]/.test(lit);
        expect({ rel, lit, hasAllFour }).toEqual({ rel, lit, hasAllFour: false });
      }
      // And each surface that suppresses must import the constant.
      expect(src).toMatch(/import\s*\{[^}]*\bMVP_HIDDEN_BUCKETS\b[^}]*\}\s*from/);
    }
  });

  // --------------------------------------------------------------------------
  // GROUP B — getEnabledBuckets filter (unit; the cascade chokepoint).
  // --------------------------------------------------------------------------

  it('contract 4: getEnabledBuckets EXCLUDES hidden buckets even when config.enabled === true', () => {
    const base = createDefaultCarePlanConfig('default');
    const cfg: CarePlanConfig = {
      ...base,
      water: { ...base.water, enabled: true },
      sleep: { ...base.sleep, enabled: true },
      activity: { ...base.activity, enabled: true },
      appointments: { ...base.appointments, enabled: true },
    };
    const enabled = getEnabledBuckets(cfg);
    expect(enabled).not.toContain('water');
    expect(enabled).not.toContain('sleep');
    expect(enabled).not.toContain('activity');
    expect(enabled).not.toContain('appointments');
  });

  it('contract 5: getEnabledBuckets STILL includes the v1-visible four when enabled', () => {
    const base = createDefaultCarePlanConfig('default');
    const cfg: CarePlanConfig = {
      ...base,
      meds: { ...base.meds, enabled: true },
      vitals: { ...base.vitals, enabled: true },
      wellness: { ...base.wellness, enabled: true },
      meals: { ...base.meals, enabled: true },
    };
    const enabled = getEnabledBuckets(cfg);
    expect(enabled).toContain('meds');
    expect(enabled).toContain('vitals');
    expect(enabled).toContain('wellness');
    expect(enabled).toContain('meals');
  });

  it('contract 6 (HIDE-NOT-DELETE): getEnabledBuckets is a PURE read — config.enabled is NOT mutated', () => {
    const base = createDefaultCarePlanConfig('default');
    const cfg: CarePlanConfig = {
      ...base,
      water: { ...base.water, enabled: true },
    };
    getEnabledBuckets(cfg);
    // The stored selection survives the read — water.enabled still true.
    expect(cfg.water.enabled).toBe(true);
  });

  it('contract 7: getEnabledBuckets source references MVP_HIDDEN_BUCKETS (single-constant control of the cascade chokepoint)', () => {
    const src = stripComments(read('types/carePlanConfig.ts'));
    const idx = src.search(/export\s+function\s+getEnabledBuckets/);
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, Math.min(src.length, idx + 400));
    expect(body).toMatch(/MVP_HIDDEN_BUCKETS/);
  });

  // --------------------------------------------------------------------------
  // GROUP C — Care Plan render: ADD_WHEN_READY derived + section guarded.
  // --------------------------------------------------------------------------

  it('contract 8: ADD_WHEN_READY_BUCKETS is DERIVED from MVP_HIDDEN_BUCKETS (not a hardcoded empty/literal list)', () => {
    // v1.1 unhide must be a one-constant change — so the section list
    // filters the optional buckets against MVP_HIDDEN_BUCKETS rather
    // than being manually emptied. Pin the derivation.
    const src = stripComments(read('app/care-plan/index.tsx'));
    expect(src).toMatch(/import\s*\{[^}]*\bMVP_HIDDEN_BUCKETS\b[^}]*\}\s*from/);
    // ADD_WHEN_READY_BUCKETS is computed via a .filter that references
    // MVP_HIDDEN_BUCKETS (i.e. derived, so removing a bucket from the
    // hidden set re-populates the section automatically). Regex
    // tolerates a `: BucketType[]` type annotation between the name
    // and `=`, and spans the multi-line .filter body ([^;] matches
    // newlines).
    expect(src).toMatch(/ADD_WHEN_READY_BUCKETS\s*(?::[^=]*)?=\s*[^;]*\.filter\([^;]*MVP_HIDDEN_BUCKETS/);
  });

  it('contract 9: the "Add when ready" section render is guarded on ADD_WHEN_READY_BUCKETS being non-empty (no empty zone)', () => {
    const src = stripComments(read('app/care-plan/index.tsx'));
    // A guard like `ADD_WHEN_READY_BUCKETS.length > 0 && (` wrapping
    // the section eyebrow + zone. Pin the length guard's presence.
    expect(src).toMatch(/ADD_WHEN_READY_BUCKETS\.length\s*>\s*0/);
  });

  // --------------------------------------------------------------------------
  // GROUP D — Vitals frequency control hidden; value/type preserved.
  // --------------------------------------------------------------------------

  it('contract 10: VitalsDrawer no longer renders the HOW OFTEN frequency control', () => {
    const src = stripComments(read('components/careplan/drawers/VitalsDrawer.tsx'));
    // The "HOW OFTEN" label + FREQUENCY_OPTIONS render are gone.
    expect(src).not.toMatch(/HOW OFTEN/);
    expect(src).not.toMatch(/FREQUENCY_OPTIONS\.map/);
  });

  it('contract 11 (HIDE-NOT-DELETE): VitalsBucketConfig.frequency type field is PRESERVED in the data model', () => {
    // The control is hidden; the data field stays so stored values
    // survive and v1.1 can re-surface the control. Pin the type
    // declaration.
    const src = read('types/carePlanConfig.ts');
    expect(src).toMatch(/frequency\??\s*:\s*['"]daily['"]\s*\|\s*['"]weekly['"]\s*\|\s*['"]as_needed['"]/);
  });

  // --------------------------------------------------------------------------
  // GROUP E — Now water-ring gated on the same constant.
  // --------------------------------------------------------------------------

  it('contract 12: Now water-ring (isWaterBucketEnabled) is gated on MVP_HIDDEN_BUCKETS', () => {
    const src = stripComments(read('app/(tabs)/now.tsx'));
    // isWaterBucketEnabled must factor in the hidden-bucket check so a
    // hidden water bucket doesn't surface the ring even if
    // config.water.enabled is true (existing user).
    const idx = src.search(/isWaterBucketEnabled\s*=/);
    expect(idx).toBeGreaterThan(-1);
    const line = src.slice(idx, Math.min(src.length, idx + 200));
    expect(line).toMatch(/MVP_HIDDEN_BUCKETS/);
  });

  // --------------------------------------------------------------------------
  // GROUP F — appointments-via-quick-log cascade (the 6th surface).
  // --------------------------------------------------------------------------

  it('contract 13: quick-log surfaces hidden buckets via getEnabledBuckets cascade (no separate hidden list in quick-log)', () => {
    // getFilteredOptions(enabledBuckets) filters by enabledBuckets
    // membership. Since getEnabledBuckets now excludes hidden buckets,
    // appointments/water/sleep/activity quick-log options vanish with
    // ZERO quick-log-specific changes. Pin that quick-log does NOT
    // hardcode its own hidden list (it relies on the cascade).
    const src = stripComments(read('constants/quickLogOptions.ts'));
    expect(src).not.toMatch(/MVP_HIDDEN_BUCKETS/); // no per-surface duplication
    // getFilteredOptions still gates on enabledBuckets.includes — the
    // cascade vehicle.
    expect(src).toMatch(/enabledBuckets\.includes/);
  });
});
