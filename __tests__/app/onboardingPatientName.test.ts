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

    it('filters BOTH the legacy "Patient" literal AND the "your loved one" placeholder', () => {
      // The PLACEHOLDERS set contains the empty string + both legacy
      // sentinels so showPatientCard / possessive header copy only fire
      // for real entered names.
      expect(src).toMatch(
        /PLACEHOLDERS\s*=\s*new\s+Set\(\[\s*['"]['"]\s*,\s*['"]Patient['"]\s*,\s*['"]your loved one['"]\s*\]\)/,
      );
    });

    it('prefers activePatient over storage when resolving the display name', () => {
      // Resolution path should set patientName to the first non-placeholder
      // value from PatientContext, falling back to safeStorage, then ''.
      expect(src).toMatch(/fromContext\s*\|\|\s*fromStorage\s*\|\|\s*['"]['"]/);
    });

    it('preserves the empty-string sentinel as the "no real name" indicator', () => {
      // The empty-string default on patientName drives the conditional
      // header: `patientName ? "${name}'s care story" : "Today's care story"`.
      // When no real name is set the fallback generic copy renders.
      expect(src).toContain("useState('')");
      expect(src).toContain("Today's care story");
    });
  });
});
