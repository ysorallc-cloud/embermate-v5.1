// ============================================================================
// Phase 33b extension Lock 2 follow-up — wizard step 3 (confirm) section
// completeness contract.
//
// The Lock 2 three-section split derives `NOW_TAB_BUCKETS` from
// `[...PRIMARY_BUCKETS, ...SECONDARY_BUCKETS].filter(!CORE)`. If a future
// `BucketType` ships without being a member of PRIMARY_BUCKETS,
// SECONDARY_BUCKETS, or OPTIONAL_BUCKETS, it would render as zero rows in
// the wizard — caregivers couldn't toggle it. Persistence (setBucketEnabled)
// would still write if called, but the user has no surface to call it from.
//
// The audit surfaced exactly this: `wellness` is a valid BucketType with
// full BUCKET_META (default-enabled, recommended, /log-evening-wellness
// link) but is a member of none of the three exported sets. With sets:
//
//   PRIMARY_BUCKETS     = ['meds','vitals','meals','water']
//   SECONDARY_BUCKETS   = ['sleep','activity']
//   OPTIONAL_BUCKETS    = ['appointments','errands','shifts','self_care']
//                       = 10 of 11 BUCKET_TYPES.
//
// Wellness is the 11th — orphaned.
//
// This contract guards against the orphan recurring. It drives off
// BUCKET_TYPES directly so adding a new bucket without giving it a
// section home will FAIL CI rather than silently drop from the wizard.
//
// Plus a row-level pin: the "Now tab" section renders EXACTLY 5 rows
// (meals/water/sleep/activity/wellness) — catches "right total, wrong
// bucket" drift the set-level test alone wouldn't.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  BUCKET_TYPES,
  PRIMARY_BUCKETS,
  SECONDARY_BUCKETS,
  OPTIONAL_BUCKETS,
  type BucketType,
} from '../../types/carePlanConfig';

const SRC = readFileSync(
  join(__dirname, '../..', 'app/care-plan/setup/confirm.tsx'),
  'utf8',
);

// CORE_BUCKETS is defined locally in confirm.tsx (not exported). Mirror it
// here from the source-of-truth literal so we don't have to import an
// internal constant.
const CORE_BUCKETS: ReadonlySet<BucketType> = new Set<BucketType>(['meds', 'vitals']);

describe('Phase 33b extension Lock 2 — wizard section completeness', () => {
  it('every BucketType is a member of exactly one displayed section (CORE / Now-tab / Care Plan)', () => {
    // The three sections rendered in confirm.tsx are:
    //   • CORE      = CORE_BUCKETS (rendered conditionally on r.enabled,
    //                 but always present in the bucket inventory)
    //   • Now-tab   = NOW_TAB_BUCKETS = PRIMARY ∪ SECONDARY minus CORE
    //   • Care Plan = CARE_PLAN_BUCKETS = OPTIONAL_BUCKETS
    //
    // Their UNION must equal BUCKET_TYPES. Their pairwise INTERSECTION
    // must be empty. Reproduce that here from the source-of-truth set
    // exports.

    const coreSection = new Set<BucketType>(CORE_BUCKETS);
    const nowTabSection = new Set<BucketType>(
      [...PRIMARY_BUCKETS, ...SECONDARY_BUCKETS].filter((b) => !CORE_BUCKETS.has(b)),
    );
    const carePlanSection = new Set<BucketType>(OPTIONAL_BUCKETS);

    // No bucket may be in more than one section.
    const intersect = (a: Set<BucketType>, b: Set<BucketType>): BucketType[] =>
      [...a].filter((x) => b.has(x));
    expect(intersect(coreSection, nowTabSection)).toEqual([]);
    expect(intersect(coreSection, carePlanSection)).toEqual([]);
    expect(intersect(nowTabSection, carePlanSection)).toEqual([]);

    // Union must cover every BucketType.
    const union = new Set<BucketType>([
      ...coreSection,
      ...nowTabSection,
      ...carePlanSection,
    ]);
    const missing = BUCKET_TYPES.filter((b) => !union.has(b));
    expect(missing).toEqual([]);
    expect(union.size).toBe(BUCKET_TYPES.length);
  });

  it('the "Now tab" section renders EXACTLY 5 rows (meals, water, sleep, activity, wellness)', () => {
    // Row-level pin. Catches "right total, wrong bucket" drift the
    // set-level completeness test alone wouldn't — e.g., if a future
    // refactor moves wellness to Care Plan and adds something else to
    // Now-tab, the union still works but the canonical 5-row scan list
    // diverges.
    //
    // Expected exact set per the wizard's UX intent: every Now-tab tile
    // surfaced as a StatRings tile on the Now stats row.
    const expected: BucketType[] = ['meals', 'water', 'sleep', 'activity', 'wellness'];

    // The confirm.tsx source must include each one in its NOW_TAB_BUCKETS
    // derivation. Today the derivation reads
    //   [...PRIMARY_BUCKETS, ...SECONDARY_BUCKETS].filter(!CORE)
    // — so the test infers from the export sets. If any future migration
    // moves the derivation off PRIMARY/SECONDARY, this assertion will
    // still pass as long as the final set matches.
    const derived = new Set<BucketType>(
      [...PRIMARY_BUCKETS, ...SECONDARY_BUCKETS].filter((b) => !CORE_BUCKETS.has(b)),
    );
    expect(derived.size).toBe(5);
    for (const bucket of expected) {
      expect(derived.has(bucket)).toBe(true);
    }
  });

  it('confirm.tsx references NOW_TAB_BUCKETS so the section is fed from the derived set (not a hardcoded list)', () => {
    // Defensive — if a future refactor hardcodes the Now-tab list
    // inline, the BUCKET_TYPES-completeness test could drift out of
    // sync with the rendered rows. Pin that confirm.tsx still uses the
    // declared set.
    expect(SRC).toMatch(/NOW_TAB_BUCKETS\.has\b/);
  });
});
