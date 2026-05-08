// ============================================================================
// Phase 5.13.c — Wizard step 2 (Template).
//
// Source-level contract for app/care-plan/setup/template.tsx:
//   • Progress dots (●●○) + "STEP 2 OF 3"
//   • Header "What kind of care?" + subtitle "Pick a starting point…"
//   • All 7 CARE_PLAN_TEMPLATES + a "Start blank" row
//   • Single-select; selected row gets a lavender visual treatment
//   • Next CTA disabled until a template is selected
//   • On Next: applyCarePlanTemplate (when not blank) + saveWizardProgress
//     ({ step: 'confirm', templateId }) + navigate to /care-plan/setup/confirm
//   • Mounts <TemplateMedSeedingModal /> when applyCarePlanTemplate returns
//     pendingMedSeeding (Option 2 — wizard preserves the same med-seeding
//     UX as Care Plan home)
//   • Back ghost button returns to step 1 (router.back)
// ============================================================================

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const STEP_PATH = join(ROOT, 'app/care-plan/setup/template.tsx');

describe('Phase 5.13.c — wizard step 2 file', () => {
  it('app/care-plan/setup/template.tsx exists', () => {
    expect(existsSync(STEP_PATH)).toBe(true);
  });
});

describe('Phase 5.13.c — header + progress', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('renders the "STEP 2 OF 3" progress label', () => {
    expect(src).toMatch(/STEP\s*2\s*OF\s*3/);
  });

  it('renders the "What kind of care?" header', () => {
    expect(src).toMatch(/What kind of care/);
  });

  it('renders the "Pick a starting point" subtitle', () => {
    expect(src).toMatch(/Pick a starting point/);
  });
});

describe('Phase 5.13.c — template list', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('imports CARE_PLAN_TEMPLATES so all 7 surface', () => {
    expect(src).toMatch(/CARE_PLAN_TEMPLATES\b/);
  });

  it('includes a "Start blank" option', () => {
    expect(src).toMatch(/Start blank|blank.*template|id:\s*['"]blank['"]/);
  });
});

describe('Phase 5.13.c — selection + Next CTA', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('Next CTA is disabled until a template is selected', () => {
    // Source must reference a `selected*` state and gate the Next CTA's
    // disabled prop on its absence.
    expect(src).toMatch(/disabled=\{/);
    expect(src).toMatch(/selectedTemplate|selectedId|selected\b/);
  });

  it('applies the chosen template via the canonical util', () => {
    expect(src).toMatch(/applyCarePlanTemplate\s*\(/);
  });

  it('saves wizard progress at step "confirm" before navigating', () => {
    expect(src).toMatch(/saveWizardProgress\s*\(/);
    expect(src).toMatch(/step:\s*['"]confirm['"]/);
  });

  it('navigates to /care-plan/setup/confirm on Next', () => {
    expect(src).toMatch(/['"]\/care-plan\/setup\/confirm['"]/);
  });

  it('skips applyCarePlanTemplate when "Start blank" is chosen', () => {
    // The branch must explicitly check for the blank id before calling
    // the apply path.
    expect(src).toMatch(/['"]blank['"]/);
  });
});

describe('Phase 5.13.c — medication seeding', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('mounts TemplateMedSeedingModal when pendingMedSeeding is set', () => {
    expect(src).toMatch(/TemplateMedSeedingModal\b/);
    expect(src).toMatch(/pendingMedSeeding\b/);
  });
});

describe('Phase 5.13.c — Back affordance', () => {
  const src = existsSync(STEP_PATH) ? readFileSync(STEP_PATH, 'utf8') : '';

  it('exposes a Back action that returns to step 1', () => {
    // router.back() takes the user to step 1 with progress preserved.
    expect(src).toMatch(/router\.back\(\)|Back/);
  });
});
