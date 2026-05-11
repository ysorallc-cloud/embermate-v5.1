// ============================================================================
// CARE PLAN LIMITS — Phase 15.5
//
// Hard caps applied across the Care Plan surfaces. Single source of
// truth so render-side enforcement (StatRings) and any future
// input-side enforcement (Care Plan setup screens, validation on
// config writes) read the same constants.
//
// 15.5 introduces MAX_TRACKED_DIMENSIONS — the cap on the number of
// stat rings rendered on Now. Pre-15.5 a local MAX_TILES=4 inside
// StatRings.tsx clamped the row at the original four-orb design.
// Phase 11.9 enabled sleep + water by default in sample-data,
// producing a 6-bucket enabledBuckets set; the old 4-cap sliced
// hydration (5th by PRIORITY_ORDER) off the row, leaving the 15.4
// hydration-ring affordance invisible on real device data. 15.5
// lifts the cap to 6.
//
// Width math at iPhone SE 320pt:
//   6 tiles × 36pt + 5 × 8pt gap + 2 × 14pt page edge = 284pt
//   → fits in 320pt with 36pt of headroom.
//
// Care Plan setup screens enforcing the cap at the input boundary
// is out of scope for 15.5 (filed for follow-up). Render-side is
// the regression-prevention floor.
// ============================================================================

export const MAX_TRACKED_DIMENSIONS = 6;
