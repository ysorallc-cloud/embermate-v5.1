// ============================================================================
// Phase 32A F12 — Appointments drawer (Reminders toggle + Q-32A.1.1 subtitle).
//
// Brief + Q-32A.1.1 lock — subtitle copy MUST match exactly:
//   off: "Reminders disabled. Appointments still visible on Now and in Journal."
//   on:  "Reminded 1 day ahead. Tap to edit."
//
// Q-32A.1.1 rationale (from project_phase_32_card_corrections.md): keep
// the row label "Appointments" (parallels Medications / Vitals / etc.);
// disambiguate "appointments off" semantics in the subtitle text.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const INDEX_SRC = readFileSync(join(ROOT, 'app/care-plan/index.tsx'), 'utf8');
const DRAWER_PATH = join(ROOT, 'components/careplan/drawers/AppointmentsDrawer.tsx');

describe('Phase 32A F12 — Appointments drawer', () => {
  it('contract 1: AppointmentsDrawer file exists', () => {
    expect(existsSync(DRAWER_PATH)).toBe(true);
  });

  it('contract 2: care-plan/index.tsx imports + mounts <AppointmentsDrawer />', () => {
    expect(INDEX_SRC).toMatch(/import\s*\{[^}]*\bAppointmentsDrawer\b[^}]*\}\s*from\s*['"][^'"]*drawers\/AppointmentsDrawer['"]/);
    expect(INDEX_SRC).toMatch(/<AppointmentsDrawer\b/);
  });

  it('contract 3: off-state subtitle exact match (Q-32A.1.1 lock)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toContain(
      'Reminders disabled. Appointments still visible on Now and in Journal.',
    );
  });

  it('contract 4: on-state subtitle exact match (Q-32A.1.1 lock)', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toContain('Reminded 1 day ahead. Tap to edit.');
  });

  it('contract 5: wires Switch to notificationsEnabled', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/notificationsEnabled/);
  });

  it('contract 6: named export present', () => {
    const src = readFileSync(DRAWER_PATH, 'utf8');
    expect(src).toMatch(/export\s+(function|const)\s+AppointmentsDrawer\b/);
  });
});
