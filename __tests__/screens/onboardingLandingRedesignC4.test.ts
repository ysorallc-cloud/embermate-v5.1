// ============================================================================
// Onboarding redesign C4 — Landing screen + orchestrator restructure.
//
// Final commit of the 4-screen onboarding redesign. LandingScreen
// REPLACES the wizard handoff: the new completeOnboarding writes the
// three required onboarding keys + generates the default care plan +
// routes to /(tabs)/now. The wizard at /care-plan/setup stays
// untouched; users who want to configure tap through from the Now
// tab's "Open Care Plan" card.
//
// Voice + visual lock per the C4 spec:
//   • Headline — "Meet {name}." Fonts.serif 32px weight 300
//   • One warm italic line — "{name}'s care starts here. Log what
//     happens, when it happens — a few taps a day, in your own
//     words." Fonts.serifItalic 16px lineHeight 26.
//   • CTA — "Start with {name}" ember → emberDeep gradient.
//   • NO bullet list. NO feature tour.
//
// Contracts pinned here (source-pin on both files; behavior at the
// completion path is encoded via the literal call shape since
// rendering FlatList + sliding + state is brittle to mount-test):
//
//   LandingScreen:
//     1. HEADLINE INTERPOLATION — "Meet ${name}." pattern present.
//     2. WARM ITALIC COPY — "care starts here" and "a few taps a day,
//        in your own words" present verbatim.
//     3. CTA INTERPOLATION — "Start with ${name}" pattern present.
//     4. EMBER GRADIENT — colors.ember + colors.emberDeep referenced.
//     5. SERIF FONT TOKENS — Fonts.serif + Fonts.serifItalic.
//     6. NO FEATURE BULLETS — no bullet/check/dot icon imports.
//
//   Orchestrator restructure (app/(onboarding)/index.tsx):
//     7. FOUR-SCREEN FLOW — ONBOARDING_SCREENS has exactly four
//        entries: Welcome, Privacy, Name, Landing (in that order).
//     8. CUT IMPORTS — AsYouUseScreen + GetStartedScreen + MeetSample
//        no longer imported. (NameScreen + LandingScreen imported.)
//     9. completeOnboarding writes ONBOARDING_COMPLETE.
//    10. completeOnboarding writes disclaimer_accepted.
//    11. completeOnboarding calls writePatientName for the captured
//        name (the three required onboarding writes round out).
//    12. completeOnboarding calls generateCarePlanFromOnboarding +
//        saveCarePlanConfig with default answers (meds + wellness
//        enabled per the spec).
//    13. completeOnboarding lands the user on /(tabs)/now (NOT on
//        the wizard at /care-plan/setup/who).
// ============================================================================

import { readFileSync } from 'fs';
import { join } from 'path';

const LANDING = readFileSync(
  join(__dirname, '../../app/(onboarding)/screens/LandingScreen.tsx'),
  'utf8',
);
const ORCH = readFileSync(
  join(__dirname, '../../app/(onboarding)/index.tsx'),
  'utf8',
);

describe('Onboarding redesign C4 — Landing screen', () => {
  it('contract 1 (HEADLINE INTERPOLATION): "Meet ${name}." interpolated headline', () => {
    expect(LANDING).toMatch(/Meet\s*\$\{[\s\S]{0,50}name[\s\S]{0,5}\}\./);
  });

  it('contract 2 (WARM ITALIC COPY): "care starts here" and "a few taps a day, in your own words" present', () => {
    expect(LANDING).toContain('care starts here');
    expect(LANDING).toContain('a few taps a day, in your own words');
  });

  it('contract 3 (CTA INTERPOLATION): "Start with ${name}" interpolated CTA label', () => {
    expect(LANDING).toMatch(/Start with\s*\$\{[\s\S]{0,50}name[\s\S]{0,5}\}/);
  });

  it('contract 4 (CHARCOAL INK GRADIENT): ONBOARDING_CTA_GRADIENT imported from the shared onboardingTokens; no slab-green (#5fb88a)', () => {
    // Onboarding redesign Round 3 — the four CTAs unify on the
    // bridge palette via the shared constant.
    expect(LANDING).toMatch(/ONBOARDING_CTA_GRADIENT/);
    expect(LANDING).toMatch(/from\s+['"]\.\.\/onboardingTokens['"]/);
    expect(LANDING).not.toMatch(/#5fb88a/i);
  });

  it('contract 5 (SERIF FONT TOKENS): Fonts.serif + Fonts.serifItalic referenced', () => {
    expect(LANDING).toMatch(/Fonts\.serif\b/);
    expect(LANDING).toMatch(/Fonts\.serifItalic\b/);
  });

  it('contract 6 (NO FEATURE BULLETS): no bullet/check/dot iconography imports', () => {
    // The Landing is a single warm-line layout — no feature tour, no
    // bullet rows. Forward-guard against accidentally importing icon
    // packs or VALUE_POINTS-style arrays here.
    expect(LANDING).not.toMatch(/VALUE_POINTS|FEATURE_LIST/);
    expect(LANDING).not.toMatch(/Ionicons\b|MaterialIcons\b/);
  });
});

describe('Onboarding redesign C4 — orchestrator restructure', () => {
  it('contract 7 (FIVE-SCREEN FLOW): ONBOARDING_SCREENS is Welcome / Privacy / Name / WatchingFor / Landing (onboarding-personalize added Q2)', () => {
    const titles: string[] = [];
    const re = /title:\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ORCH))) titles.push(m[1]);
    expect(titles).toEqual(['Welcome', 'Privacy', 'Name', 'WatchingFor', 'Landing']);
  });

  it('contract 8 (CUT IMPORTS): AsYouUseScreen + GetStartedScreen + MeetSampleScreen no longer imported; NameScreen + LandingScreen are', () => {
    expect(ORCH).not.toMatch(/from\s+['"]\.\/screens\/AsYouUseScreen['"]/);
    expect(ORCH).not.toMatch(/from\s+['"]\.\/screens\/GetStartedScreen['"]/);
    expect(ORCH).not.toMatch(/from\s+['"]\.\/screens\/MeetSampleScreen['"]/);
    expect(ORCH).toMatch(/from\s+['"]\.\/screens\/NameScreen['"]/);
    expect(ORCH).toMatch(/from\s+['"]\.\/screens\/LandingScreen['"]/);
  });

  it('contract 9 (writes ONBOARDING_COMPLETE)', () => {
    expect(ORCH).toMatch(/safeSetItem\s*\(\s*StorageKeys\.ONBOARDING_COMPLETE/);
  });

  it('contract 10 (writes disclaimer_accepted)', () => {
    expect(ORCH).toMatch(/safeSetItem\s*\(\s*['"]disclaimer_accepted['"]/);
  });

  it('contract 11 (calls writePatientName with the captured name)', () => {
    expect(ORCH).toMatch(/writePatientName/);
  });

  it('contract 12 (generates the care plan from COLLECTED answers via generateCarePlanFromOnboarding + saveCarePlanConfig)', () => {
    expect(ORCH).toMatch(/generateCarePlanFromOnboarding/);
    expect(ORCH).toMatch(/saveCarePlanConfig/);
    // onboarding-personalize — the plan is built from the caregiver's
    // collected Q2 careAreas (state), not a hardcoded meds+wellness pair.
    expect(ORCH).toMatch(/careAreas\s*,/);
    expect(ORCH).not.toMatch(/careAreas:\s*\[\s*['"]medications['"]\s*,\s*['"]wellness['"]\s*\]/);
  });

  it('contract 13 (lands on /(tabs)/now, NOT the wizard)', () => {
    expect(ORCH).toMatch(/router\.replace\([^)]*['"]\/\(tabs\)\/now['"]/);
    // Wizard handoff retired from completeOnboarding's success path.
    expect(ORCH).not.toMatch(/['"]\/care-plan\/setup\/who['"][\s\S]{0,200}from:\s*['"]onboarding['"]/);
  });
});
