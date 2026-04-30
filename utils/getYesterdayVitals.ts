// ============================================================================
// GET YESTERDAY VITALS
//
// Finds the most recent reading of a given vital type from yesterday's
// calendar window. Returns null when nothing was logged. Used by the Now
// timeline's vitals checkbox flow to pre-fill yesterday's value as a sane
// default — the caregiver confirms or edits in one tap rather than typing
// from scratch.
//
// This is a thin wrapper over `getVitalsByType` for v6.7. The fuller
// `dailyReflectionRepo` (with end-of-day vital snapshots, narrative
// generation) lands with Prompt 3's silent-vitals capture screen.
// ============================================================================

import {
  getVitalsByType,
  type VitalReading,
  type VitalType,
} from './vitalsStorage';
import { logError } from './devLog';

function yesterdayBounds(now: Date): { startMs: number; endMs: number } {
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

/**
 * Returns the most recent reading of `type` from yesterday's calendar day,
 * or null when no reading was logged. Calendar boundaries are local time.
 */
export async function getYesterdayVitals(
  type: VitalType,
  patientId?: string,
): Promise<VitalReading | null> {
  try {
    const readings = patientId
      ? await getVitalsByType(type, patientId)
      : await getVitalsByType(type);

    const { startMs, endMs } = yesterdayBounds(new Date());

    let latest: VitalReading | null = null;
    let latestMs = -Infinity;
    for (const r of readings) {
      const ts = new Date(r.timestamp).getTime();
      if (isNaN(ts)) continue;
      if (ts < startMs || ts > endMs) continue;
      if (ts > latestMs) {
        latest = r;
        latestMs = ts;
      }
    }
    return latest;
  } catch (err) {
    logError('getYesterdayVitals', err);
    return null;
  }
}
