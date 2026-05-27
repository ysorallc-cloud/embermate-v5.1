// ============================================================================
// Phase 34 F3.1 — wellness cadence subtitle helper.
//
// Pure function reading carePlanConfig.wellness.timesOfDay and returning a
// human-readable check-in cadence label for the Care Plan home's wellness
// row subtitle. Read-only — no writes, no state, no side effects.
//
// Pre-F3.1 this helper read the P5 store (wellnessSettings.{morning,evening}
// .enabled). That made the subtitle disagree with the generator (which
// reads timesOfDay) — the dual-store divergence F2 explicitly flagged
// as a one-phase artifact. F3.1 closes it: subtitle, generator, AND
// the wellness chips all read carePlanConfig.wellness.timesOfDay.
//
// User-locked behavior (2026-05-27):
//   • All four windows enabled → "Morning + afternoon + evening + night check-in"
//   • Three windows           → comma + last-conjunction form via the same builder
//   • Two windows             → "<W1> + <w2> check-in" (e.g. "Morning + evening check-in")
//   • One window              → "<W> check-in"
//   • Empty / null / undefined → null (do NOT invent text)
// ============================================================================

import type { TimeOfDay } from '../types/carePlanConfig';

// Ordering for stable output regardless of the array's input order.
// Mirrors the canonical TimeOfDay ordering used in TIME_OF_DAY_OPTIONS.
const TOD_ORDER: TimeOfDay[] = ['morning', 'midday', 'evening', 'night'];

// Display labels — first occurrence is capitalized ("Morning"), subsequent
// joins are lowercased ("morning + evening" reads naturally as a sentence).
const TOD_LABEL_CAP: Record<TimeOfDay, string> = {
  morning: 'Morning',
  midday: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  custom: 'Custom',
};
const TOD_LABEL_LOWER: Record<TimeOfDay, string> = {
  morning: 'morning',
  midday: 'afternoon',
  evening: 'evening',
  night: 'night',
  custom: 'custom',
};

export function getWellnessCadenceText(
  timesOfDay: TimeOfDay[] | null | undefined,
): string | null {
  if (!timesOfDay || timesOfDay.length === 0) return null;

  // Sort by canonical order and drop unknowns / duplicates so the
  // output is stable regardless of input order.
  const known = TOD_ORDER.filter((t) => timesOfDay.includes(t));
  if (known.length === 0) return null;

  const labels = known.map((t, i) =>
    i === 0 ? TOD_LABEL_CAP[t] : TOD_LABEL_LOWER[t],
  );

  return `${labels.join(' + ')} check-in`;
}
