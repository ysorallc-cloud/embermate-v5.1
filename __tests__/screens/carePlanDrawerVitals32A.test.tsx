// ============================================================================
// Phase 32A F6 — Vitals drawer (chips + frequency dropdown + reminders).
//
// Brief:
//   • WHICH VITALS chips (multi-select): Blood Pressure, Heart Rate,
//     Weight, Oxygen Level, Blood Sugar, Temperature. Defaults: BP /
//     HR / Weight on.
//   • HOW OFTEN dropdown: Daily / Weekly / As Needed. Default: Daily.
//   • Reminders Switch. Default: on.
//
// HealthKit Auto-Import section from the retired vitals subscreen is
// NOT folded into the drawer (P3 lock — preserved + parked for v1.1
// separately).
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_PATH = join(ROOT, 'components/careplan/drawers/VitalsDrawer.tsx');
const CONFIG_SRC = readFileSync(join(ROOT, 'types/carePlanConfig.ts'), 'utf8');

describe('Phase 32A F6 — Vitals drawer', () => {
  it('contract 1: VitalsDrawer file exists', () => {
    expect(existsSync(DRAWER_PATH)).toBe(true);
  });

  it('contract 2: care-plan/index.tsx imports + mounts <VitalsDrawer />', () => {
    expect(INDEX_SRC).toMatch(/import\s*\{[^}]*\bVitalsDrawer\b[^}]*\}\s*from\s*['"][^'"]*drawers\/VitalsDrawer['"]/);
    expect(INDEX_SRC).toMatch(/<VitalsDrawer\b/);
  });

  it('contract 3: DEFAULT_VITALS_CONFIG.vitalTypes includes the brief-locked BP/HR/Weight defaults', () => {
    // The drawer reads vitalTypes from config; brief locks default
    // chip selection at BP + HR + Weight. Pin the canonical default
    // here so a future contributor doesn't drop one silently.
    const m = CONFIG_SRC.match(/DEFAULT_VITALS_CONFIG[^=]*=\s*\{[\s\S]*?vitalTypes:\s*\[([^\]]+)\]/);
    expect(m).not.toBeNull();
    const items = m![1];
    expect(items).toMatch(/['"]bp['"]/);
    expect(items).toMatch(/['"]hr['"]/);
    expect(items).toMatch(/['"]weight['"]/);
  });

  it('contract 4: drawer source surfaces all six chip labels + their canonical codes', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    // Labels (brief copy)
    expect(src).toMatch(/Blood Pressure/);
    expect(src).toMatch(/Heart Rate/);
    expect(src).toMatch(/Weight/);
    expect(src).toMatch(/Oxygen Level/);
    expect(src).toMatch(/Blood Sugar/);
    expect(src).toMatch(/Temperature/);
    // Codes (storage values)
    expect(src).toMatch(/['"]bp['"]/);
    expect(src).toMatch(/['"]hr['"]/);
    expect(src).toMatch(/['"]weight['"]/);
    expect(src).toMatch(/['"]spo2['"]/);
    expect(src).toMatch(/['"]glucose['"]/);
    expect(src).toMatch(/['"]temp['"]/);
  });

  it('contract 5: drawer surfaces the three frequency options (Daily / Weekly / As Needed)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/Daily/);
    expect(src).toMatch(/Weekly/);
    expect(src).toMatch(/As Needed|as_needed/i);
    // Storage values
    expect(src).toMatch(/['"]daily['"]/);
    expect(src).toMatch(/['"]weekly['"]/);
    expect(src).toMatch(/['"]as_needed['"]/);
  });

  it('contract 6: vitalTypes + frequency + notificationsEnabled all wired', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/vitalTypes/);
    expect(src).toMatch(/frequency/);
    expect(src).toMatch(/notificationsEnabled/);
  });

  it('contract 7: NO HealthKit Auto-Import surface (P3 lock — parked for v1.1, retired separately)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(stripped).not.toMatch(/HealthKit/i);
    expect(stripped).not.toMatch(/Auto-Import|autoImport/i);
  });

  it('contract 8: named export present', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/export\s+(function|const)\s+VitalsDrawer\b/);
  });
});
