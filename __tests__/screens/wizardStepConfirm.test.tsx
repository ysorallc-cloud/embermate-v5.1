// ============================================================================
// Phase 5.13.d — Wizard step 3 (Confirm).
//
// Source-level contract for app/care-plan/setup/confirm.tsx:
//   • Progress dots (●●●) + "STEP 3 OF 3"
//   • Header "Confirm [PatientName]'s plan" + subtitle "Tap any to adjust"
//   • Reads current carePlanConfig (set by step 2's apply path)
//   • Splits buckets into CORE (always-on, non-toggleable) and OPTIONAL
//     (toggleable). Core membership is template-specific; for v1 the
//     buckets that the active template enabled with required-priority
//     count as core. Toggling an optional bucket persists immediately
//     via setBucketEnabled.
//   • Primary CTA "Done — let's start" sets the first-real-mode flag,
//     clears wizard progress, replaces to /(tabs)/now.
//   • Back returns to step 2.
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const STEP_PATH = join(ROOT, 'app/care-plan/setup/confirm.tsx');

describe('Phase 5.13.d — wizard step 3 file', () => {
  it('app/care-plan/setup/confirm.tsx exists', () => {
    expect(existsSync(STEP_PATH)).toBe(true);
  });
});

describe('Phase 5.13.d — header + progress', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('renders the "STEP 3 OF 3" progress label', () => {
    expect(src).toMatch(/STEP\s*3\s*OF\s*3/);
  });

  it("renders the personalized 'Confirm …’s plan' header", () => {
    // Header must interpolate the patient name. The template literal
    // can take a variety of shapes — assert on a recognisable keyword.
    expect(src).toMatch(/Confirm/);
    expect(src).toMatch(/'s plan|patientName/);
  });

  it('uses the canonical patient-name hook (5.13.1.a)', () => {
    expect(src).toMatch(/useActivePatientName\b/);
  });
});

describe('Phase 5.13.d — bucket sections', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  // Phase 33b extension Lock 2 — reframed: the prior "OPTIONAL" section
  // split into "These show on your Now tab" + "These show on your Care
  // Plan" so caregivers can tell which 5 of 9 toggles surface on the
  // Now-tab daily scan and which 4 live on dedicated Care Plan screens.
  // CORE section copy also softened (lowercase via SectionEyebrow's
  // uppercase render at the primitive layer).

  it('renders a Core section (canon-cased "Core — always on")', () => {
    expect(src).toMatch(/Core\s*—\s*always on|CORE.*ALWAYS ON/);
  });

  it('renders the "These show on your Now tab" section', () => {
    expect(src).toMatch(/These show on your Now tab/);
  });

  it('renders the "These show on your Care Plan" section', () => {
    expect(src).toMatch(/These show on your Care Plan/);
  });

  it('reads the current care plan config', () => {
    expect(src).toMatch(/getCarePlanConfig|getOrCreateCarePlanConfig|useCarePlanConfig/);
  });

  it('persists optional toggles via setBucketEnabled', () => {
    expect(src).toMatch(/setBucketEnabled\b/);
  });
});

describe('Phase 5.13.d — Done CTA', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it("renders the 'Done — let's start' CTA copy", () => {
    expect(src).toMatch(/Done.*let.s start|Done\s*—/);
  });

  it('sets the first-real-mode flag before navigating', () => {
    expect(src).toMatch(/@embermate_first_real_mode_landed|first_real_mode_landed/);
  });

  it('clears wizard progress on Done', () => {
    expect(src).toMatch(/clearWizardProgress\s*\(/);
  });

  it('replaces to /(tabs)/now on Done (not push) so back button does not re-enter the wizard', () => {
    expect(src).toMatch(/router\.replace\s*\([^)]*\/\(tabs\)\/now/);
  });
});

describe('Phase 5.13.d — Back affordance', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('exposes a Back action that returns to step 2', () => {
    expect(src).toMatch(/router\.back\(\)|Back/);
  });
});
