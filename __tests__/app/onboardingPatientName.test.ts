// ============================================================================
// 1_BLOCKERS Fix 4 — Patient name from onboarding
// ============================================================================
//
// Verifies the wiring between the onboarding name input, persistent storage,
// and the three downstream consumers (now / journal / understand). Each tab
// must filter the legacy 'Patient' default AND the friendly 'your loved one'
// skip placeholder so display copy only uses *real* entered names.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('Onboarding patient name persistence', () => {
  const getStarted = read('app/(onboarding)/screens/GetStartedScreen.tsx');

  it('GetStartedScreen prompts for the patient name', () => {
    // v6.7: the labeled "Their name" / "Your name" header above the input
    // was retired. The TextInput lives inside the primary card's expanded
    // panel with a per-mode placeholder that drives the prompt.
    expect(getStarted).toContain('TextInput');
    expect(getStarted).toMatch(/setPatientName|onChangeText=\{setPatientName\}/);
    expect(getStarted).toMatch(/Mom, Dad, Linda|Your first name/);
  });

  it('skip fallback writes the friendly placeholder, not the legacy "Patient" literal', () => {
    expect(getStarted).toContain("patientName.trim() || 'your loved one'");
    expect(getStarted).not.toContain("patientName.trim() || 'Patient'");
  });

  it('persists name through the canonical writePatientName helper', () => {
    // Phase 5.13.1.b — registry write + AsyncStorage mirror + EVENT.PATIENT
    // emit are consolidated under writePatientName.
    expect(getStarted).toMatch(/writePatientName\(['"]default['"]\s*,\s*name\s*\)/);
  });
});

describe('Tab consumers filter placeholder names', () => {
  describe('now.tsx', () => {
    const src = read('app/(tabs)/now.tsx');

    it('reads from PatientContext via usePatient()', () => {
      expect(src).toContain("import { usePatient } from '../../contexts/PatientContext'");
      expect(src).toMatch(/usePatient\(\)/);
    });

    it('filters the legacy "Patient" literal', () => {
      expect(src).toMatch(/!==\s*['"]Patient['"]/);
    });

    it('falls back to "your loved one" for placeholder/empty values', () => {
      expect(src).toContain("'your loved one'");
    });
  });

  describe('understand.tsx', () => {
    const src = read('app/(tabs)/understand.tsx');

    it('reads from PatientContext via usePatient()', () => {
      expect(src).toContain("import { usePatient } from '../../contexts/PatientContext'");
      expect(src).toMatch(/const\s*\{\s*activePatient\s*\}\s*=\s*usePatient\(\)/);
    });

    it('filters the legacy "Patient" literal', () => {
      expect(src).toMatch(/activePatient\.name\s*!==\s*['"]Patient['"]/);
    });

    it('falls back to "your loved one"', () => {
      expect(src).toContain("'your loved one'");
    });
  });

  describe('journal.tsx', () => {
    const src = read('app/(tabs)/journal.tsx');

    it('reads from PatientContext via usePatient()', () => {
      expect(src).toContain("import { usePatient } from '../../contexts/PatientContext'");
      expect(src).toMatch(/const\s*\{\s*activePatient\s*\}\s*=\s*usePatient\(\)/);
    });

    it('filters legacy + placeholder names via the canonical hook', () => {
      // Phase 5.13.1.c — the PLACEHOLDERS Set + fromContext/fromStorage
      // resolution moved into useActivePatientNameRaw. Journal seeds its
      // local state from that hook, so the hook applies the filter.
      expect(src).toMatch(/useActivePatientNameRaw\b/);
    });

    it('preserves the empty-string sentinel as the "no real name" indicator', () => {
      // Local state still defaults to '' so showPatientCard / possessive
      // header copy only fire for real names. The hook returns null when
      // no real name is set, which the seeding line maps to ''.
      expect(src).toContain("useState('')");
      expect(src).toMatch(/setPatientName\s*\(\s*patientNameRaw\s*\?\?/);
    });
  });
});
