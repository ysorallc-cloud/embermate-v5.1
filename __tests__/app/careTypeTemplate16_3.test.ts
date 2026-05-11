// ============================================================================
// Phase 16.3 — Care-type templates narrowed from 7 → 4.
//
// Pre-16.3 the "What kind of care?" picker (app/care-plan/setup/template.tsx,
// step 2 of 3) listed 7 templates: elderly / post-surgical / chronic-illness
// / general-wellness / pediatric / mental-health / hospice — plus a "blank"
// 8th option.
//
// 16.3 narrows the active set to 4 templates plus blank, deferring the
// specialized templates to v1.1+:
//
//   ACTIVE (v1.0):
//     • elderly (rendered as "Aging in Place")
//     • chronic-illness
//     • general-wellness
//     • blank
//
//   DEFERRED (v1.1+ — IDs preserved as comments in carePlanTemplates.ts so
//   the work can resume cleanly without re-deriving the template shapes):
//     • post-surgical
//     • pediatric
//     • mental-health
//     • hospice
//
// No migration needed — the template ID is NOT persisted on save. Only the
// resulting bucket state (CarePlanConfig with which buckets are enabled +
// at what priority) lives in storage. Removing template options from the
// picker doesn't reach back into existing users' saved plans.
//
// Source-level audit: codeOnly() strips comments before matching so the
// v1.1+ retirement-marker prose doesn't false-positive against the
// "deferred templates are gone" pins.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const ROOT = join(__dirname, '../..');
const rawTemplatesSrc = readFileSync(
  join(ROOT, 'constants/carePlanTemplates.ts'), 'utf8',
);
const templatesCode = codeOnly(rawTemplatesSrc);

describe('Phase 16.3 — care-type templates narrowed', () => {
  it('contract 1: exactly 4 active template definitions remain in the exported CARE_PLAN_TEMPLATES array', () => {
    // Each template object opens with an `id:` entry. After commenting
    // out 4 of the 7 specialized templates, only the 4 active IDs
    // (elderly, chronic-illness, general-wellness) should appear as
    // ACTIVE (uncommented) `id: '...'` lines.
    //
    // Note: "blank" is rendered in the picker's choices list, NOT in
    // CARE_PLAN_TEMPLATES — the picker appends a synthetic blank
    // choice. So 3 active template IDs in the array → 4 visible
    // choices in the picker (3 + blank).
    const idMatches = templatesCode.match(/id:\s*['"][^'"]+['"]/g) || [];
    const ids = idMatches.map((m) => m.match(/['"]([^'"]+)['"]/)![1]);
    expect(ids).toEqual(['elderly', 'chronic-illness', 'general-wellness']);
  });

  it('contract 2: the 4 deferred template IDs are preserved as commented v1.1+ markers in source', () => {
    // The raw source (with comments) must still mention each retired
    // ID alongside the v1.1+ marker so the work can resume without
    // re-deriving the template shapes.
    expect(rawTemplatesSrc).toMatch(/v1\.1\+|v1\.1\b/);
    for (const deferredId of ['post-surgical', 'pediatric', 'mental-health', 'hospice']) {
      expect(rawTemplatesSrc).toContain(deferredId);
    }
  });

  it('contract 3: the "Aging in Place" label is preserved (id "elderly" not renamed)', () => {
    // Spec note: update the label string, not the ID — cheaper than
    // renaming through every consumer. Audit confirms 'elderly' is
    // already labeled 'Aging in Place'; pin both pieces.
    expect(templatesCode).toMatch(/id:\s*['"]elderly['"]/);
    expect(templatesCode).toMatch(/name:\s*['"]Aging in Place['"]/);
  });

  it('contract 4: the picker still renders the blank 8th-row affordance', () => {
    // The blank choice is synthesized inside the picker, not in
    // CARE_PLAN_TEMPLATES. Pin its presence in the template.tsx
    // source.
    const pickerSrc = readFileSync(
      join(ROOT, 'app/care-plan/setup/template.tsx'), 'utf8',
    );
    expect(pickerSrc).toMatch(/BLANK_ID\s*=\s*['"]blank['"]/);
  });
});
