// ============================================================================
// INSIGHTS HERO — data-sufficiency gate + adherence read-line (insights-hero).
//
// Two pure helpers behind the signature ring:
//
//  1. getRingReadiness() — decides whether to show the populated ring or the
//     pre-data "PATTERNS COMING" state. A 0%/grey ring reads as failure on a
//     fresh install (§8 honesty), so the ring appears ONLY once there's enough
//     logged history: daysLogged >= MIN_DAYS_FOR_RING AND there are med doses
//     to compute a rate from (total > 0 — this is what prevents the 0/0 → 0%).
//
//     MIN_DAYS_FOR_RING is an explicit, single-source constant: a week of
//     logged days is a meaningful adherence sample without making the caregiver
//     wait a fortnight to see the signature object. Confirm on device-check.
//
//  2. buildAdherenceRead() — the factual read-line under the ring. Kept
//     factual (a missed-dose count, gentle frame) — NOT interpretive prose;
//     auto-narrating a real person's health day is a trust risk. The missed
//     count is coral so it reads at a glance.
// ============================================================================

/** Logged days required before the adherence ring appears. Explicit + single-source. */
export const MIN_DAYS_FOR_RING = 7;

export interface RingReadiness {
  /** True → render the populated ring; false → render "PATTERNS COMING". */
  ready: boolean;
  daysLogged: number;
  threshold: number;
  daysRemaining: number;
}

export function getRingReadiness(
  coverage: { daysLogged?: number } | null | undefined,
  adherence: { total?: number } | null | undefined,
): RingReadiness {
  const daysLogged = coverage?.daysLogged ?? 0;
  const total = adherence?.total ?? 0;
  const ready = total > 0 && daysLogged >= MIN_DAYS_FOR_RING;
  return {
    ready,
    daysLogged,
    threshold: MIN_DAYS_FOR_RING,
    daysRemaining: Math.max(0, MIN_DAYS_FOR_RING - daysLogged),
  };
}

export type ReadTone = 'neutral' | 'coral';
export interface ReadSegment {
  text: string;
  tone: ReadTone;
}

/**
 * The read-line under the ring. Returns colored segments so the component can
 * paint the missed count coral without re-parsing a string.
 */
export function buildAdherenceRead(
  a: { rate?: number; taken?: number; total?: number; windowDays?: number } | null | undefined,
): ReadSegment[] {
  const total = a?.total ?? 0;
  const taken = a?.taken ?? 0;
  const rate = a?.rate ?? 0;
  const days = a?.windowDays ?? 14;
  const missed = Math.max(0, total - taken);

  if (missed === 0) {
    return [{ text: `Every dose logged across the last ${days} days.`, tone: 'neutral' }];
  }

  const doseWord = missed === 1 ? 'dose' : 'doses';
  const segments: ReadSegment[] = [];
  if (rate >= 85) segments.push({ text: 'Holding steady — ', tone: 'neutral' });
  segments.push({ text: `${missed} ${doseWord} missed`, tone: 'coral' });
  segments.push({ text: ` across the last ${days} days.`, tone: 'neutral' });
  return segments;
}

export function ringWindowLabel(windowDays: number): string {
  return `PAST ${windowDays} DAYS`;
}

/** Copy for the pre-data "PATTERNS COMING" state (shown in place of the ring). */
export function patternsComingCopy(r: RingReadiness): {
  headline: string;
  progressLabel: string;
  sub: string;
  fraction: number;
} {
  const remaining = r.daysRemaining;
  const dayWord = remaining === 1 ? 'day' : 'days';
  return {
    headline: 'PATTERNS COMING',
    progressLabel: `${r.daysLogged} of ${r.threshold} days logged`,
    sub:
      remaining === 0
        ? 'Your adherence ring appears as soon as today’s doses are logged.'
        : `${remaining} more ${dayWord} of logging, then your adherence ring appears.`,
    fraction: r.threshold > 0 ? Math.min(1, r.daysLogged / r.threshold) : 0,
  };
}
