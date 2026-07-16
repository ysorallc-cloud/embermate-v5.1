// ============================================================================
// VITALS OBSERVATION — the ONE canonical vitals-vs-history engine (STEP 1).
//
// This is the single place in the app allowed to decide whether a vital
// reading is unusual. It compares a reading to THIS PERSON'S OWN history and
// returns a NEUTRAL observation — 'above_usual' | 'within_usual' |
// 'below_usual' (or 'insufficient_history') plus the count of readings the
// call is based on.
//
// It deliberately does NOT:
//   • use any fixed population cutoff (no 140/90/150/130/99.5 constants) — the
//     comparison band is derived from the person's own mean + spread, so
//     "unusual" means unusual FOR THEM, not against a textbook number; and
//   • emit any clinical verdict. It never returns "high", "elevated",
//     "abnormal", "out of range", or a severity — those are diagnoses. It
//     returns a direction relative to the person's baseline, and a caller may
//     render it as a fact ("BP 145/92, above their usual") but never a verdict.
//     This reuses the Gate D neutral-language contract
//     (__tests__/gates/gateD_noClinicalVerdict.test.ts).
//
// Every surface that used to compute its own cutoff (careSummaryBuilder,
// insightEngine, careInsights, narrativeSummaryBuilder, journalReflections)
// migrates onto observeVital(); the guard test
// (__tests__/vitalThresholdCanonicalGuard.test.ts) forbids a 7th.
// ============================================================================

export type ObservationDirection =
  | 'above_usual'
  | 'within_usual'
  | 'below_usual'
  | 'insufficient_history';

export interface VitalObservation {
  /** Where the reading sits relative to the person's own baseline. */
  direction: ObservationDirection;
  /** How many historical readings the observation is based on. */
  historyCount: number;
  /** The person's usual (mean of history) for context — null if insufficient. */
  usual: number | null;
}

export interface ObserveVitalOptions {
  /** Minimum historical readings before an above/below call is made. Below
   *  this, direction is 'insufficient_history' (mirrors the existing
   *  "null if <3 readings" convention in RecentHistory). */
  minHistory?: number;
  /** How many standard deviations from the person's mean still counts as
   *  "within usual". Larger = more tolerant. */
  sdMultiplier?: number;
  /** Floor on the comparison band as a fraction of the mean, so a near-constant
   *  history (tiny SD) doesn't flag trivial noise as unusual. */
  minBandFraction?: number;
}

const DEFAULT_MIN_HISTORY = 3;
const DEFAULT_SD_MULTIPLIER = 1;
const DEFAULT_MIN_BAND_FRACTION = 0.05;

/**
 * Observe a single vital reading against this person's own history.
 *
 * Per-person by construction: the same reading can be 'above_usual' for a
 * person whose history sits low and 'within_usual' for a person whose history
 * sits high. No fixed population cutoff is involved.
 *
 * @param current  the reading to classify
 * @param history  the person's prior readings for the same vital (any order)
 */
export function observeVital(
  current: number,
  history: ReadonlyArray<number>,
  options: ObserveVitalOptions = {},
): VitalObservation {
  const minHistory = options.minHistory ?? DEFAULT_MIN_HISTORY;
  const sdMultiplier = options.sdMultiplier ?? DEFAULT_SD_MULTIPLIER;
  const minBandFraction = options.minBandFraction ?? DEFAULT_MIN_BAND_FRACTION;

  const values = history.filter((v) => typeof v === 'number' && Number.isFinite(v));
  const historyCount = values.length;

  if (!Number.isFinite(current) || historyCount < minHistory) {
    return { direction: 'insufficient_history', historyCount, usual: null };
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / historyCount;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / historyCount;
  const sd = Math.sqrt(variance);

  // Band around the person's mean. The SD term makes a naturally variable
  // person harder to flag; the fractional floor keeps a near-constant person
  // from flagging on trivial noise. Neither term is a population threshold.
  const band = Math.max(sdMultiplier * sd, minBandFraction * Math.abs(mean));

  let direction: ObservationDirection;
  if (current > mean + band) direction = 'above_usual';
  else if (current < mean - band) direction = 'below_usual';
  else direction = 'within_usual';

  return { direction, historyCount, usual: mean };
}

/**
 * Neutral phrase fragments for each direction — the shared vocabulary for
 * rendering an observation. Facts about the person's baseline, never verdicts:
 * no "high"/"low"/"elevated"/"abnormal"/"out of range". Callers prepend the
 * vital name and value, e.g. `Blood pressure 145/92 is ${phrase}`.
 */
export const OBSERVATION_PHRASE: Record<ObservationDirection, string> = {
  above_usual: 'above their usual',
  within_usual: 'within their usual range',
  below_usual: 'below their usual',
  insufficient_history: 'not yet comparable — still building their baseline',
};
