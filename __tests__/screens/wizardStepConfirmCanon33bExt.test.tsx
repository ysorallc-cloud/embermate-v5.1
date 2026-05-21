// ============================================================================
// Phase 33b extension Lock 2 — care-plan wizard step 3 (confirm) canon migration.
//
// Pins three coupled changes in `app/care-plan/setup/confirm.tsx`:
//
//   1. Three-section split — the prior OPTIONAL section listed all 9
//      togglable buckets without telling caregivers which 5 surface
//      on the Now-tab daily scan vs which 4 live on dedicated Care
//      Plan screens. Post-fix splits into "These show on your Now
//      tab" (PRIMARY+SECONDARY minus CORE) and "These show on your
//      Care Plan" (OPTIONAL_BUCKETS). Persistence unchanged — all 9
//      still write to setBucketEnabled. UX-only fix.
//
//   2. All three section eyebrows migrate to SectionEyebrow primitive
//      with tint="caregiverAccent" — canon scale (11pt) + letterSpacing
//      1.5 + lane-coherence across the wizard's three steps. The local
//      `eyebrow:` style block is retired.
//
//   3. CTA lane assignment (per Lock 3.4 per-CTA decision): the
//      "Done — let's start" primary CTA on step 3 stays lavender
//      (c.caregiverAccent). Caregiver finalizing the care plan = Tier 3
//      caregiver→clinician handoff lane (Phase 26 F4 precedent). Steps
//      1 (who.tsx) + 2 (template.tsx) flip to sage in Lock 2's wizard
//      CTA sweep — see those files' contracts.
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(
  join(__dirname, '../..', 'app/care-plan/setup/confirm.tsx'),
  'utf8',
);

describe('Phase 33b extension Lock 2 — confirm.tsx three-section split + SectionEyebrow migration', () => {
  // --------------------------------------------------------------------------
  // 1. Three-section split — bucket filters
  // --------------------------------------------------------------------------

  it('imports PRIMARY_BUCKETS + SECONDARY_BUCKETS + OPTIONAL_BUCKETS from carePlanConfig', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*\bPRIMARY_BUCKETS\b[^}]*\bSECONDARY_BUCKETS\b[^}]*\bOPTIONAL_BUCKETS\b[^}]*\}\s*from\s*['"][^'"]*carePlanConfig['"]/,
    );
  });

  it('defines NOW_TAB_BUCKETS = PRIMARY + SECONDARY minus CORE', () => {
    expect(SRC).toMatch(
      /NOW_TAB_BUCKETS[\s\S]{0,200}\[\s*\.\.\.PRIMARY_BUCKETS\s*,\s*\.\.\.SECONDARY_BUCKETS\s*\]\.filter\([\s\S]+?CORE_BUCKETS/,
    );
  });

  it('defines CARE_PLAN_BUCKETS from OPTIONAL_BUCKETS', () => {
    expect(SRC).toMatch(/CARE_PLAN_BUCKETS[\s\S]{0,80}OPTIONAL_BUCKETS/);
  });

  it('renders three row groups — coreRows + nowTabRows + carePlanRows', () => {
    expect(SRC).toMatch(/const\s+coreRows\s*=/);
    expect(SRC).toMatch(/const\s+nowTabRows\s*=/);
    expect(SRC).toMatch(/const\s+carePlanRows\s*=/);
  });

  it('the retired `optionalRows` filter is gone (regression guard)', () => {
    expect(SRC).not.toMatch(/const\s+optionalRows\s*=/);
  });

  it('preserves persistence — toggles still write via setBucketEnabled', () => {
    // UX-only change must not touch the write path.
    expect(SRC).toMatch(/setBucketEnabled\b/);
  });

  // --------------------------------------------------------------------------
  // 2. SectionEyebrow primitive migration
  // --------------------------------------------------------------------------

  it('imports SectionEyebrow', () => {
    expect(SRC).toMatch(
      /import\s*\{[^}]*\bSectionEyebrow\b[^}]*\}\s*from\s*['"][^'"]*SectionEyebrow['"]/,
    );
  });

  it('all three section headers render via SectionEyebrow with tint="caregiverAccent"', () => {
    // Core eyebrow
    expect(SRC).toMatch(
      /<SectionEyebrow\s+text="Core — always on"\s+tint="caregiverAccent"/,
    );
    // Now-tab eyebrow
    expect(SRC).toMatch(
      /<SectionEyebrow\s+text="These show on your Now tab"\s+tint="caregiverAccent"/,
    );
    // Care Plan eyebrow
    expect(SRC).toMatch(
      /<SectionEyebrow\s+text="These show on your Care Plan"\s+tint="caregiverAccent"/,
    );
  });

  it('the legacy local `eyebrow:` style block is retired', () => {
    // SectionEyebrow primitive owns the eyebrow styling now. The
    // inline 10pt + letterSpacing 0.5 + textTertiary block was
    // local-canon-drift from before Phase 33b Scope 3 locked
    // letterSpacing 1.5 at the primitive layer.
    expect(SRC).not.toMatch(/^\s+eyebrow:\s*\{[\s\S]{0,200}fontSize:\s*10/m);
  });

  // --------------------------------------------------------------------------
  // 3. CTA lane assignment — "Done — let's start" handoff-lane chrome
  // --------------------------------------------------------------------------

  it('primary "Done — let\'s start" CTA preserves the handoff lane via dark fill + lavender border + lavender text (Phase 33b extension lavender no-fill canon — reframed from Phase 26 F4 lavender fill)', () => {
    // Lock 2's per-CTA assignment had given step 3 a saturated
    // `c.caregiverAccent` fill so the wizard's lane progression read as
    // sage → sage → lavender (action-affirmative → commit/handoff).
    // Phase 33b extension lavender no-fill canon (site #3) restricts
    // lavender to eyebrow-scale text + thin accents, never fills. The
    // lane signal moves into the chrome: dark/glass fill + 1pt lavender
    // border + lavender label text. The button stays visibly distinct
    // from a sage action-affirmative CTA without violating the no-fill
    // canon. Steps 1 (who) + 2 (template) stay sage per their separate
    // contracts.
    const primaryBlock = SRC.match(/primary:\s*\{[\s\S]{0,400}?\n\s{4}\},/);
    expect(primaryBlock).not.toBeNull();
    const block = primaryBlock![0];
    // Dark / glass fill (the background canvas itself).
    expect(block).toMatch(/backgroundColor:\s*c\.background\b/);
    // 1pt lavender border carries the lane signal.
    expect(block).toMatch(/borderWidth:\s*1\b/);
    expect(block).toMatch(/borderColor:\s*c\.caregiverAccent\b/);
    // No saturated lavender fill (regression defense against the pre-cleanup
    // chrome silently returning).
    expect(block).not.toMatch(/backgroundColor:\s*c\.caregiverAccent\b/);
    // Paired text color flips to lavender so the label reads on the dark fill.
    expect(SRC).toMatch(/primaryText:\s*\{[\s\S]{0,200}?color:\s*c\.caregiverAccent\b/);
  });

  it('"Done — let\'s start" CTA copy preserved', () => {
    expect(SRC).toMatch(/Done\s*—\s*let'?s start/);
  });

  // --------------------------------------------------------------------------
  // testID migration (helps simulator + future test pinning)
  // --------------------------------------------------------------------------

  it('rows carry testIDs distinguishing the three sections', () => {
    expect(SRC).toMatch(/testID=\{`wizard-confirm-core-\$\{r\.type\}`\}/);
    expect(SRC).toMatch(/testID=\{`wizard-confirm-now-\$\{r\.type\}`\}/);
    expect(SRC).toMatch(/testID=\{`wizard-confirm-careplan-\$\{r\.type\}`\}/);
  });
});
