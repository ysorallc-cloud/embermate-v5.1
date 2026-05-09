// ============================================================================
// Wellness field descriptions — Phase 10.2 update.
//
// Pre-10.2 the screen carried per-row description prose written as
// complete sentences with patient-name interpolation
// ("Track ${name}'s pain on a none-to-severe scale."). This test pinned
// that copy verbatim plus the absence of legacy comma-list descriptions
// like "None, mild, moderate, severe".
//
// Post-10.2 (Phase 10 tightened pass) the row description prose is
// gone entirely — optional rows render as label + Switch only, with
// no per-row prose. The patient-name interpolation is also gone (the
// strongest regression pin lives in
// __tests__/screens/wellnessConfigTightened.test.tsx).
//
// What this audit still pins:
//   • Legacy comma-list descriptions stay forbidden — if anyone
//     re-introduces "Alert, confused, drowsy, unresponsive" as a row
//     description, this test fails.
//   • The constants no longer carry a `description` field at all,
//     since rows are label-only. Adding one back would re-open the
//     question of where the explanation should live (section helper,
//     tooltip, etc.).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const src = readFileSync(join(ROOT, 'app/care-plan/wellness.tsx'), 'utf8');

describe('Phase 10.2 — wellness field metadata is label-only (no row prose)', () => {
  it('field constants carry no description field', () => {
    // Pre-10.2 had `{ key: 'orientation', label: 'Orientation', description: '...' }`.
    // Post-10.2: `{ key: 'orientation', label: 'Orientation' }`.
    // The description key would re-introduce per-row prose.
    expect(src).not.toMatch(/description:\s*[`'"]/);
  });

  it('legacy "Alert & oriented, confused, disoriented" comma-list copy stays gone', () => {
    expect(src).not.toContain('Alert & oriented, confused, disoriented');
  });

  it('legacy "Own decisions, needs guidance, unable" copy stays gone', () => {
    expect(src).not.toContain('Own decisions, needs guidance, unable');
  });

  it('legacy "None, mild, moderate, severe" copy stays gone', () => {
    expect(src).not.toContain('None, mild, moderate, severe');
  });

  it('legacy "Alert, confused, drowsy, unresponsive" copy stays gone', () => {
    expect(src).not.toContain('Alert, confused, drowsy, unresponsive');
  });

  it('legacy "Independent, partial/full assist" copy stays gone', () => {
    expect(src).not.toContain('Independent, partial/full assist');
  });

  it('legacy "Independent, walker, cane, wheelchair" copy stays gone', () => {
    expect(src).not.toContain('Independent, walker, cane, wheelchair');
  });
});

describe('Phase 10.2 — wellness no longer interpolates the patient name', () => {
  it('does NOT import usePatient', () => {
    expect(src).not.toMatch(/from\s+['"][^'"]*PatientContext['"]/);
    expect(src).not.toMatch(/usePatient\(/);
  });

  it('does NOT reference a patient name fallback like "your loved one"', () => {
    expect(src).not.toMatch(/['"]your loved one['"]/);
  });

  it('source carries no ${patient...} interpolation', () => {
    expect(src).not.toMatch(/\$\{[a-zA-Z_]*[Pp]atient[A-Za-z]*\}/);
    expect(src).not.toMatch(/\$\{patient\}/);
  });
});
