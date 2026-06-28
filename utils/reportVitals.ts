// ============================================================================
// REPORT VITALS — shared empty-state copy + detail builder.
//
// Single source of truth for how every report path renders the Vitals section
// when Vitals is INCLUDED but no readings exist in range. The trust rule: a
// report must never ship a blank/omitted section the caregiver toggled on —
// it must say so explicitly. Both report paths render the SAME string:
//   • app/care-report.tsx  — Full export (details key/value rows)
//   • services/visitPrepPdf.ts — Visit Prep HTML
// ============================================================================

export const NO_VITALS_IN_RANGE = 'No vitals logged in this range.';

export interface VitalsReadings {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  oxygen?: number;
}

export interface VitalsDetailRow {
  label: string;
  value: string;
}

/**
 * Build the care-report Full-export Vitals rows. Mirrors the prior inline
 * logic (BP / HR / O2, each conditional) but guarantees an EXPLAINED
 * empty-state row instead of silently emitting zero rows when Vitals is
 * included with no readings in range.
 */
export function buildVitalsDetails(readings: VitalsReadings | null | undefined): VitalsDetailRow[] {
  const rows: VitalsDetailRow[] = [];
  if (readings) {
    if (readings.systolic && readings.diastolic) {
      rows.push({ label: 'Blood Pressure', value: `${readings.systolic}/${readings.diastolic} mmHg` });
    }
    if (readings.heartRate) {
      rows.push({ label: 'Heart Rate', value: `${readings.heartRate} bpm` });
    }
    if (readings.oxygen) {
      rows.push({ label: 'O2 Saturation', value: `${readings.oxygen}%` });
    }
  }
  if (rows.length === 0) {
    rows.push({ label: 'Vitals', value: NO_VITALS_IN_RANGE });
  }
  return rows;
}
