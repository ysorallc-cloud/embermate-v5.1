// ============================================================================
// CHANGE DETECTION THRESHOLDS — Phase 5.12.4a (V1 PLACEHOLDER).
//
// V1 PLACEHOLDER thresholds — NOT CLINICALLY VALIDATED.
// Pending review. See PHASE_5_12_THRESHOLDS.md (TODO).
//
// Conservative defaults intentional — better to under-flag than fatigue
// caregivers with daily noise. Each category uses both a deviation
// threshold AND a minimum baseline-data requirement so that a user 5
// days into using the app does not get flagged on thin history.
// ============================================================================

/**
 * Per-category change thresholds. A change is significant when the
 * category's value crosses the threshold relative to its baseline
 * window — see BASELINE_REQUIREMENTS for window length and minimum
 * baseline depth.
 */
export const DAY_CHANGE_THRESHOLDS = {
  vitals: { deviationPercent: 15 },     // BP/HR >15% above the rolling avg → flag
  meals: { refusalGapDays: 7 },         // First refused meal in 7+ days → flag
  mood: { dropPoints: 2 },              // Mood drop ≥2 points from rolling avg → flag
  symptoms: { noveltyDays: 14 },        // New symptom not seen in 14 days → flag
  sleep: { deviationHours: 2 },         // Sleep ≥2hr below rolling avg → note
} as const;

/**
 * Baseline data requirements per category.
 *
 * `window` — days of prior history the detector reads to compute its
 *            baseline (rolling average, presence set, etc.).
 * `minDays` — minimum number of days within that window that must carry
 *            data of the relevant category. When the baseline is thinner
 *            than this, the detector returns null instead of silently
 *            falling back to a noisy baseline. Symptoms uses `0` because
 *            novelty detection ("first time in 14 days") does not require
 *            a statistical baseline — it's a presence check.
 */
export const BASELINE_REQUIREMENTS = {
  vitals:   { window: 14, minDays: 7 },
  meals:    { window: 7,  minDays: 4 },
  mood:     { window: 7,  minDays: 4 },
  symptoms: { window: 14, minDays: 0 },
  sleep:    { window: 14, minDays: 7 },
} as const;
