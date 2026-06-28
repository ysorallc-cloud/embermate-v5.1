// ============================================================================
// Report vitals empty-state — care-report Full-export parity with Visit Prep
// (device-walk fix #2).
//
// When a report INCLUDES Vitals but no readings exist in range, it must render
// an EXPLAINED empty-state — never silently omit the section (trust rule).
// Visit Prep (services/visitPrepPdf.ts) already did this; care-report.tsx's
// Full export silently dropped the rows. This pins the shared behavior + a
// single source-of-truth string ("No vitals logged in this range.") used by
// BOTH report paths.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';
import { buildVitalsDetails, NO_VITALS_IN_RANGE } from '../../utils/reportVitals';

const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('reportVitals empty-state (fix #2)', () => {
  it('agreed string is "No vitals logged in this range."', () => {
    expect(NO_VITALS_IN_RANGE).toBe('No vitals logged in this range.');
  });

  describe('buildVitalsDetails — explained empty-state, never silent omission', () => {
    it('full readings → BP + HR + O2 rows, no empty-state', () => {
      const rows = buildVitalsDetails({ systolic: 120, diastolic: 80, heartRate: 70, oxygen: 98 });
      const labels = rows.map((r) => r.label);
      expect(labels).toEqual(['Blood Pressure', 'Heart Rate', 'O2 Saturation']);
      expect(rows.map((r) => r.value)).not.toContain(NO_VITALS_IN_RANGE);
    });

    it('null readings (vitals included, none in range) → single explained empty-state row', () => {
      const rows = buildVitalsDetails(null);
      expect(rows).toEqual([{ label: 'Vitals', value: NO_VITALS_IN_RANGE }]);
    });

    it('empty readings object → explained empty-state (not zero rows)', () => {
      const rows = buildVitalsDetails({});
      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe(NO_VITALS_IN_RANGE);
    });

    it('partial readings (HR only) → just that row, no empty-state', () => {
      const rows = buildVitalsDetails({ heartRate: 72 });
      expect(rows).toEqual([{ label: 'Heart Rate', value: '72 bpm' }]);
    });
  });

  describe('both report paths use the single shared string', () => {
    it('care-report.tsx Full export routes vitals through buildVitalsDetails', () => {
      const src = read('app/care-report.tsx');
      expect(src).toMatch(/buildVitalsDetails/);
    });

    it('visitPrepPdf.ts uses NO_VITALS_IN_RANGE and drops the old per-path string', () => {
      const src = read('services/visitPrepPdf.ts');
      expect(src).toMatch(/NO_VITALS_IN_RANGE/);
      expect(src).not.toMatch(/No vitals readings in this window/);
    });
  });
});
