// ============================================================================
// Care plan grouping coherence — wizard confirm vs Care Plan management screen.
//
// REPRODUCTION (failing contract written BEFORE any fix is applied).
//
// Symptom (device-confirmed): the wizard's confirm step groups buckets
// differently from the Care Plan management screen. Same per-bucket
// `{enabled: boolean}` state in storage; the divergence is purely at
// the render layer where each screen defines its OWN local CORE_BUCKETS
// set and partitions the rest into UI sections accordingly.
//
//   • app/care-plan/setup/confirm.tsx:60
//       CORE_BUCKETS = new Set(['meds', 'vitals'])                 ← 2 buckets
//   • app/care-plan/index.tsx:40
//       CORE_BUCKETS: BucketType[] = ['meds', 'vitals',
//                                     'wellness', 'meals']         ← 4 buckets
//
// The wizard then derives NOW_TAB_BUCKETS as
// `[...PRIMARY, ...SECONDARY].filter(!CORE)` (= meals/water/sleep/
// activity/wellness — 5 buckets), and the management screen derives
// OPTIONAL_TOGGLE_BUCKETS as `BUCKET_TYPES.filter(!CORE)` (= water/
// sleep/activity/appointments/errands/shifts/self_care — 7 buckets).
//
// Because the two CORE sets disagree, meals + wellness appear in the
// management screen's "CORE — ALWAYS ON" but in the wizard's "These
// show on your Now tab" instead — directly matching the device
// screenshots.
//
// The single canonical source-of-truth (types/carePlanConfig.ts) exports
// BUCKET_TYPES + PRIMARY_BUCKETS + SECONDARY_BUCKETS + OPTIONAL_BUCKETS
// but does NOT export CORE_BUCKETS. Both screens roll their own.
//
// This contract asserts the two CORE sets are equal, names the buckets
// in the symmetric difference, and adds a forward-looking pin that
// future work should export CORE_BUCKETS from carePlanConfig.ts so both
// surfaces consume the same definition.
//
// AFTER A FIX, both assertions go green. Until then, this test stands
// as the reproduction.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

const confirmSrc = readFileSync(
  join(ROOT, 'app/care-plan/setup/confirm.tsx'),
  'utf8',
);
const carePlanIndexSrc = readFileSync(
  join(ROOT, 'app/care-plan/index.tsx'),
  'utf8',
);
const configSrc = readFileSync(join(ROOT, 'types/carePlanConfig.ts'), 'utf8');

// Anchor the regex on `const CORE_BUCKETS` so the import statement
// (`CORE_BUCKETS,` inside an import block) doesn't false-positive. Returns
// null if no LOCAL declaration exists — which is the post-canonicalization
// healthy state (both screens consume the canonical export from
// types/carePlanConfig.ts).
function extractLocalCoreBuckets(src: string): string[] | null {
  const match = src.match(
    /\bconst\s+CORE_BUCKETS\b[^=]*=\s*(?:new\s+Set\()?\s*\[([^\]]+)\]/,
  );
  if (!match) return null;
  const inner = match[1];
  const buckets = Array.from(
    inner.matchAll(/['"]([a-zA-Z_]+)['"]/g),
    (m) => m[1],
  );
  return Array.from(new Set(buckets)).sort();
}

// Check whether a file imports CORE_BUCKETS from the canonical config
// module. Both screens MUST consume the export — defending the
// single-source-of-truth shape against future "I'll just declare it
// locally" drift.
function importsCoreBuckets(src: string): boolean {
  return /import\s*\{[^}]*\bCORE_BUCKETS\b[^}]*\}\s*from\s*['"][^'"]*carePlanConfig['"]/s.test(
    src,
  );
}

describe('Care plan grouping coherence — wizard vs management screen', () => {
  it('wizard imports the canonical CORE_BUCKETS; neither surface redeclares it locally (Phase 32A reframe)', () => {
    // Pre-canonicalization (pre-2026-05-21) BOTH files declared their
    // own local `const CORE_BUCKETS = ...` with DIFFERENT contents
    // (wizard ['meds', 'vitals']; management ['meds', 'vitals',
    // 'wellness', 'meals']) — see the file header for the device-visible
    // bug that drift caused.
    //
    // Phase 32A reframe: the wizard still groups by CORE_BUCKETS so it
    // continues to import the canonical export. The management screen
    // now renders the three-section inline-expand layout (F2) with
    // section-specific allocations (ALWAYS_ON_BUCKETS /
    // DAILY_TRACKING_BUCKETS / ADD_WHEN_READY_BUCKETS) that don't map
    // 1:1 to CORE_BUCKETS — so it no longer consumes CORE_BUCKETS as
    // an import. The structural drift guard the pre-32A pin defended
    // (no local CORE_BUCKETS redeclaration in either file) survives:
    // if a future contributor copy-pastes a local CORE_BUCKETS into
    // either surface, this test still catches it.
    const wizardLocal = extractLocalCoreBuckets(confirmSrc);
    const managementLocal = extractLocalCoreBuckets(carePlanIndexSrc);
    const wizardImports = importsCoreBuckets(confirmSrc);

    const errors: string[] = [];
    if (wizardLocal) {
      errors.push(
        `  app/care-plan/setup/confirm.tsx declares a LOCAL CORE_BUCKETS = ${JSON.stringify(wizardLocal)}.\n` +
          `    Delete the local declaration and import CORE_BUCKETS from types/carePlanConfig.`,
      );
    }
    if (managementLocal) {
      errors.push(
        `  app/care-plan/index.tsx declares a LOCAL CORE_BUCKETS = ${JSON.stringify(managementLocal)}.\n` +
          `    Phase 32A retired the management-screen CORE_BUCKETS consumption — section allocation\n` +
          `    is now per-section (ALWAYS_ON_BUCKETS / DAILY_TRACKING_BUCKETS / ADD_WHEN_READY_BUCKETS).\n` +
          `    Remove the local CORE_BUCKETS; use the new section consts.`,
      );
    }
    if (!wizardImports) {
      errors.push(
        `  app/care-plan/setup/confirm.tsx does not import CORE_BUCKETS from carePlanConfig.\n` +
          `    Add CORE_BUCKETS to the import block from '../../../types/carePlanConfig'.`,
      );
    }
    // Management screen no longer needs to import CORE_BUCKETS in
    // Phase 32A — its three section allocation consts live in the file
    // itself. Don't assert that import here.

    if (errors.length > 0) {
      throw new Error(
        `Care plan grouping desync:\n${errors.join('\n')}\n\n` +
          `Single source of truth for CORE_BUCKETS lives in types/carePlanConfig.ts.\n` +
          `Wizard consumes it canonically; management screen uses its own per-section\n` +
          `allocation (Phase 32A F2). Either surface declaring a LOCAL CORE_BUCKETS is\n` +
          `the drift class that broke us pre-canonicalization.`,
      );
    }
    expect(errors).toEqual([]);
  });

  it('canonical CORE_BUCKETS = [meds, vitals] (the membership Phase 32A specs and the device-bug fix requires)', () => {
    // Pins the chosen membership. Phase 32A's Care Plan grouping puts
    // meds + vitals as ALWAYS ON and moves meals + wellness to toggles
    // under DAILY TRACKING. This pin makes the canonical export match
    // that target. If future scope changes the always-on set, this
    // assertion + its comment force the change to land here (one place)
    // with a rationale.
    const match = configSrc.match(
      /export\s+const\s+CORE_BUCKETS[^=]*=\s*\[([^\]]+)\]/,
    );
    expect(match).not.toBeNull();
    const buckets = Array.from(
      match![1].matchAll(/['"]([a-zA-Z_]+)['"]/g),
      (m) => m[1],
    ).sort();
    expect(buckets).toEqual(['meds', 'vitals']);
  });

  it('CORE_BUCKETS should be exported from types/carePlanConfig.ts (forward-looking — single source of truth)', () => {
    // Sibling pin: once the desync above is fixed by canonicalizing
    // CORE_BUCKETS, both screens should import it from carePlanConfig
    // rather than re-declaring it locally. Pinning this forward-looking
    // shape prevents the next contributor from "fixing" the desync by
    // copy-pasting the same list into both files (which would re-open
    // the same drift risk the next time the CORE definition changes).
    const isExported = /export\s+const\s+CORE_BUCKETS\b/.test(configSrc);
    if (!isExported) {
      throw new Error(
        `types/carePlanConfig.ts does not export CORE_BUCKETS.\n\n` +
          `The PRIMARY / SECONDARY / OPTIONAL sets are exported from this module and consumed\n` +
          `by both the wizard and the management screen. CORE_BUCKETS should follow the same\n` +
          `pattern so the "always-on" set lives in exactly one place. This is a forward-looking\n` +
          `pin — once it goes green, both screens consume the canonical export and the desync\n` +
          `above can't silently regress via copy-paste drift.`,
      );
    }
    expect(isExported).toBe(true);
  });
});
