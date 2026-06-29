// ============================================================================
// CANONICAL VITALS — single source of truth for clinician artifacts + counts.
//
// Wave-1 clinician-artifact convergence (Fix #2). Reports/counts conform to the
// SCREENS. The canonical store is `@embermate_central_vitals_logs` (store B,
// centralStorage.VitalsLog) — exactly what Now reads (getTodayVitalsLog) and
// Journal reads (getTodayVitalsLog / getVitalsLogs). The prior divergence:
//   • Visit Prep PDF read store A (`@vitals_readings`, vitalsStorage) — a
//     SEPARATE store that only happens to be co-populated by the QuickLog
//     dual-write, so it could silently drift from what Now/Journal show.
//   • The Insights "vitals logged N times" counter read store C (vitals-typed
//     LogEntry completions in `@embermate_logs_v2`) — a store the normal log
//     flow NEVER writes vitals to, so it was permanently 0 even with BP/HR
//     visible on Now.
//
// This util reads store B and exposes it in the two shapes the consumers need:
//   • getCanonicalVitalReadingsInRange → VitalReading[] (per-type rows) so the
//     Visit Prep grouping logic works unchanged.
//   • countCanonicalVitalsInRange → number of reading events in the window
//     (one VitalsLog = one reading event), for the Insights counter.
// ============================================================================

import { getVitalsLogs, type VitalsLog } from './centralStorage';
import { DEFAULT_PATIENT_ID } from '../storage/carePlanRepo';
import type { VitalReading, VitalType } from './vitalsStorage';
import { logError } from './devLog';

/** Map each named VitalsLog field to the VitalReading.type + unit the Visit
 *  Prep grouping expects. `oxygen` and `oxygenSaturation` coalesce to one
 *  'oxygen' row so a log carrying both doesn't double-count. */
const FIELD_UNITS: { field: keyof VitalsLog; type: VitalType; unit: string }[] = [
  { field: 'systolic', type: 'systolic', unit: 'mmHg' },
  { field: 'diastolic', type: 'diastolic', unit: 'mmHg' },
  { field: 'heartRate', type: 'heartRate', unit: 'bpm' },
  { field: 'glucose', type: 'glucose', unit: 'mg/dL' },
  { field: 'temperature', type: 'temperature', unit: '°F' },
  { field: 'weight', type: 'weight', unit: 'lb' },
];

function inRange(timestamp: string, startMs: number, endMs: number): boolean {
  const t = new Date(timestamp).getTime();
  return !Number.isNaN(t) && t >= startMs && t <= endMs;
}

/** Store-B VitalsLog entries within [startISO, endISO] inclusive. */
export async function getCanonicalVitalsLogsInRange(
  startISO: string,
  endISO: string,
  patientId: string = DEFAULT_PATIENT_ID,
): Promise<VitalsLog[]> {
  try {
    const logs = await getVitalsLogs(patientId);
    const startMs = new Date(startISO).getTime();
    const endMs = new Date(endISO).getTime();
    return logs.filter(l => inRange(l.timestamp, startMs, endMs));
  } catch (err) {
    logError('vitalsCanonical.getCanonicalVitalsLogsInRange', err);
    return [];
  }
}

/** Store-B vitals as per-type VitalReading rows — the shape the Visit Prep
 *  vitals section already groups/trends. Drop-in replacement for the
 *  store-A getVitalsInRange. */
export async function getCanonicalVitalReadingsInRange(
  startISO: string,
  endISO: string,
  patientId: string = DEFAULT_PATIENT_ID,
): Promise<VitalReading[]> {
  const logs = await getCanonicalVitalsLogsInRange(startISO, endISO, patientId);
  const readings: VitalReading[] = [];
  for (const log of logs) {
    for (const m of FIELD_UNITS) {
      const v = log[m.field];
      if (typeof v === 'number') {
        readings.push({ id: `${log.id}-${m.type}`, type: m.type, value: v, unit: m.unit, timestamp: log.timestamp });
      }
    }
    // oxygen / oxygenSaturation coalesce to a single 'oxygen' row.
    const oxy = typeof log.oxygen === 'number' ? log.oxygen
      : typeof log.oxygenSaturation === 'number' ? log.oxygenSaturation
      : undefined;
    if (typeof oxy === 'number') {
      readings.push({ id: `${log.id}-oxygen`, type: 'oxygen', value: oxy, unit: '%', timestamp: log.timestamp });
    }
  }
  return readings;
}

/** Count of vitals READING EVENTS in the window (one VitalsLog = one event) —
 *  what the caregiver actually recorded, the number Now/Journal reflect. */
export async function countCanonicalVitalsInRange(
  startISO: string,
  endISO: string,
  patientId: string = DEFAULT_PATIENT_ID,
): Promise<number> {
  return (await getCanonicalVitalsLogsInRange(startISO, endISO, patientId)).length;
}
