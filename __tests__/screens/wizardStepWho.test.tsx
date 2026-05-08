// ============================================================================
// Phase 5.13.b — Wizard step 1 (Who).
//
// Source-level contract for app/care-plan/setup/who.tsx:
//   • Progress dots + "STEP 1 OF 3" label
//   • Header "Who are you caring for?" + subtitle
//   • Two text inputs (patient + caregiver), prefill via canonical hook
//   • Primary CTA "Next →" disabled until patient name is non-empty
//   • Cancel returns based on `from` param: settings → /settings,
//     banner|transition → /(tabs)/now, onboarding → onboarding stack
//   • On Next: writePatientName + saveCaregiverProfile + saveWizardProgress
//     + navigate to /care-plan/setup/template
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const STEP_PATH = join(ROOT, 'app/care-plan/setup/who.tsx');
const LAYOUT_PATH = join(ROOT, 'app/care-plan/setup/_layout.tsx');

describe('Phase 5.13.b — wizard files exist', () => {
  it('app/care-plan/setup/_layout.tsx exists', () => {
    expect(existsSync(LAYOUT_PATH)).toBe(true);
  });

  it('app/care-plan/setup/who.tsx exists', () => {
    expect(existsSync(STEP_PATH)).toBe(true);
  });
});

describe('Phase 5.13.b — header + progress', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('renders the "STEP 1 OF 3" progress label', () => {
    expect(src).toMatch(/STEP\s*1\s*OF\s*3/);
  });

  it('renders the "Who are you caring for?" header', () => {
    expect(src).toMatch(/Who are you caring for/);
  });

  it('renders the helper subtitle "Just a name"', () => {
    expect(src).toMatch(/Just a name/);
  });
});

describe('Phase 5.13.b — name prefill via canonical hook', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('prefills patient name via useActivePatientNameRaw (5.13.1.a)', () => {
    expect(src).toMatch(/useActivePatientNameRaw\b/);
  });

  it('prefills caregiver name via getCaregiverProfile', () => {
    expect(src).toMatch(/getCaregiverProfile\b/);
  });
});

describe('Phase 5.13.b — Next CTA + persistence', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('Next button is disabled until patient name is non-empty', () => {
    // Disabled prop may derive from a `canProceed` flag or be inline; in
    // either shape, the source must trim the patient name and gate on it.
    expect(src).toMatch(/disabled=\{/);
    expect(src).toMatch(/(patientName|trimmedPatient)\.\s*trim\(\)|trimmedPatient\.length\s*>\s*0|patientName\.trim\(\)\.length/);
  });

  it('persists patient name via the canonical writePatientName helper (5.13.1.b)', () => {
    expect(src).toMatch(/writePatientName\s*\(/);
  });

  it('persists caregiver name via saveCaregiverProfile when provided', () => {
    expect(src).toMatch(/saveCaregiverProfile\s*\(/);
  });

  it('saves wizard progress at step "template" before navigating', () => {
    expect(src).toMatch(/saveWizardProgress\s*\(/);
    expect(src).toMatch(/step:\s*['"]template['"]/);
  });

  it('navigates to /care-plan/setup/template on Next', () => {
    expect(src).toMatch(/['"]\/care-plan\/setup\/template['"]/);
  });
});

describe('Phase 5.13.b — Cancel routing by entry source', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('reads the `from` param via useLocalSearchParams', () => {
    expect(src).toMatch(/useLocalSearchParams[\s\S]{0,80}from/);
  });

  it("Cancel routes back to /settings when from === 'settings'", () => {
    expect(src).toMatch(/['"]settings['"][\s\S]{0,200}\/settings/);
  });

  it("Cancel routes back to /(tabs)/now for banner / transition entries", () => {
    expect(src).toMatch(/banner|transition/);
    expect(src).toMatch(/\/\(tabs\)\/now/);
  });

  it("Cancel returns within onboarding when from === 'onboarding'", () => {
    expect(src).toMatch(/['"]onboarding['"][\s\S]{0,300}\(onboarding\)/);
  });
});
