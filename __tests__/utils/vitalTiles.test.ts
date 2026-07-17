// ============================================================================
// vitalTiles — per-person Insights-tab tile flags (STEP 1b).
//
// Pins the migration off fixed cutoffs (BP >=130/85, glucose >180) onto the
// canonical observeVital(): a tile flags "unusual" (amber color / "N above
// usual" label) only when a reading is above THIS person's own baseline, never
// a textbook number — and stays neutral (green) when there's too little
// baseline to compare.
// ============================================================================

import { computeVitalTiles } from '../../utils/vitalTiles';
import { Colors } from '../../theme/theme-tokens';
import type { VitalReading } from '../../utils/vitalsStorage';

let clock = 0;
function r(type: string, value: number): VitalReading {
  // Monotonic timestamps so the builder's sort is deterministic.
  clock += 1;
  return { type, value, unit: '', timestamp: new Date(2026, 0, 1, 0, clock).toISOString() } as VitalReading;
}
function series(type: string, values: number[]): VitalReading[] {
  return values.map((v) => r(type, v));
}
const tile = (tiles: any[], label: string) => tiles.find((t) => t.label === label);

beforeEach(() => { clock = 0; });

describe('computeVitalTiles — BP tile, per-person color', () => {
  it('amber when the latest BP is above their usual baseline', () => {
    const readings = series('systolic', [148, 150, 152]); // latest 152
    const baseline = series('systolic', [118, 121, 119, 120, 122]); // usual ~120
    const bp = tile(computeVitalTiles(readings, baseline), 'Blood Pressure');
    expect(bp.color).toBe(Colors.amberBright);
  });

  it('green when the latest BP is within their usual — even if textbook-high', () => {
    // Person who always runs ~150; latest 151 is normal FOR THEM.
    const readings = series('systolic', [149, 150, 151]);
    const baseline = series('systolic', [148, 151, 150, 149, 152]);
    const bp = tile(computeVitalTiles(readings, baseline), 'Blood Pressure');
    expect(bp.color).toBe(Colors.green);
  });

  it('green (not falsely amber) when there is too little baseline', () => {
    const readings = series('systolic', [150, 152, 148]);
    const baseline: VitalReading[] = []; // no baseline
    const bp = tile(computeVitalTiles(readings, baseline), 'Blood Pressure');
    expect(bp.color).toBe(Colors.green);
  });
});

describe('computeVitalTiles — Glucose tile, per-person "above usual" count', () => {
  it('counts readings above their usual and flags amber', () => {
    const readings = series('glucose', [200, 210, 205]); // all above their usual
    const baseline = series('glucose', [95, 100, 98, 102, 99]); // usual ~99
    const glu = tile(computeVitalTiles(readings, baseline), 'Glucose');
    expect(glu.color).toBe(Colors.amberBright);
    expect(glu.trendVal).toMatch(/above usual/);
    expect(glu.trendVal).toMatch(/^3 /); // all 3 above their usual
  });

  it('neutral when within their usual (no fixed 180 cutoff)', () => {
    // Person who usually runs high (~200) — 205 is normal for them.
    const readings = series('glucose', [198, 205, 200]);
    const baseline = series('glucose', [198, 202, 200, 199, 203]);
    const glu = tile(computeVitalTiles(readings, baseline), 'Glucose');
    expect(glu.color).toBe(Colors.green);
    expect(glu.trendVal).toBe('→');
  });

  it('neutral when there is too little baseline', () => {
    const readings = series('glucose', [200, 210]);
    const glu = tile(computeVitalTiles(readings, []), 'Glucose');
    expect(glu.color).toBe(Colors.green);
  });
});
