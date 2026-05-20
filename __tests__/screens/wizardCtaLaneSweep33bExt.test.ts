// ============================================================================
// Phase 33b extension Lock 2 — wizard CTA lane sweep.
//
// Per Lock 3.4 per-CTA lane assignment (NOT a blanket flip):
//
//   Step 1 (who.tsx)        primary CTA → sage    (c.accent)
//                                                  ↑ action-affirmative
//                                                    ("set up the patient")
//
//   Step 2 (template.tsx)   primary CTA → sage    (c.accent)
//                                                  ↑ forward-progress
//                                                    between wizard steps
//                                                    ("Next →")
//
//   Step 3 (confirm.tsx)    primary CTA → lavender (c.caregiverAccent)
//                                                  ↑ caregiver finalizing
//                                                    plan = Tier 3
//                                                    handoff lane, Phase
//                                                    26 F4 precedent
//                                                    ("Done — let's start")
//
// The lane progresses sage → sage → lavender across the wizard's three
// steps. Pre-fix all three were lavender (defaulted from the Phase 26
// lane treatment); post-fix the lane signal sharpens to "you commit at
// step 3, not before."
//
// confirm.tsx's lavender stay is pinned in
// `wizardStepConfirmCanon33bExt.test.tsx`. This file pins the sage
// flip on steps 1 + 2.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const WHO = readFileSync(join(__dirname, '../..', 'app/care-plan/setup/who.tsx'), 'utf8');
const TEMPLATE = readFileSync(join(__dirname, '../..', 'app/care-plan/setup/template.tsx'), 'utf8');

describe('Phase 33b extension Lock 2 — wizard CTA lane sweep', () => {
  describe('Step 1 — who.tsx primary CTA is sage (action-affirmative)', () => {
    it('primary style backgroundColor is c.accent (not c.caregiverAccent)', () => {
      // Pin the `primary:` style block in particular — other lavender
      // consumers in the same file (selected-state highlights, accent
      // text) stay lavender and are unrelated to the CTA lane.
      expect(WHO).toMatch(
        /primary:\s*\{[\s\S]{0,250}backgroundColor:\s*c\.accent\b/,
      );
      // Negative: the `primary:` block must NOT reference
      // c.caregiverAccent as its background.
      const primaryBlock = WHO.match(/primary:\s*\{[\s\S]{0,250}?\},/)?.[0] ?? '';
      expect(primaryBlock).not.toMatch(/backgroundColor:\s*c\.caregiverAccent\b/);
    });
  });

  describe('Step 2 — template.tsx primary CTA is sage (forward-progress)', () => {
    it('primary style backgroundColor is c.accent (not c.caregiverAccent)', () => {
      expect(TEMPLATE).toMatch(
        /primary:\s*\{[\s\S]{0,250}backgroundColor:\s*c\.accent\b/,
      );
      const primaryBlock = TEMPLATE.match(/primary:\s*\{[\s\S]{0,250}?\},/)?.[0] ?? '';
      expect(primaryBlock).not.toMatch(/backgroundColor:\s*c\.caregiverAccent\b/);
    });

    it('CTA copy reads "Next" (forward-progress, not commit)', () => {
      // Lane rationale: forward-progress copy + sage chrome.
      // If a future refactor changes the copy to "Done" or "Confirm,"
      // the lane assignment should be revisited (commit semantics
      // should be lavender per Tier 3 handoff lane).
      expect(TEMPLATE).toMatch(/Next\s*→|Next →/);
    });
  });
});
