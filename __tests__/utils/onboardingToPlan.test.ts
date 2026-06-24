import {
  generateCarePlanFromOnboarding,
  getCoreQuickLogFromAnswers,
  DEFAULT_CARE_AREAS,
  OnboardingAnswers,
} from '../../utils/onboardingToPlan';

const baseAnswers: OnboardingAnswers = {
  relationship: 'parent',
  careAreas: [],
  concerns: [],
  cadence: 'morning_evening',
};

const withAreas = (careAreas: OnboardingAnswers['careAreas']): OnboardingAnswers => ({
  ...baseAnswers,
  careAreas,
});

describe('onboardingToPlan — generateCarePlanFromOnboarding (onboarding-personalize)', () => {
  // ── Nothing force-on; everything gates on selection ───────────────────────
  it('NOTHING FORCE-ON: selecting ONLY medications leaves wellness, water, meals, vitals OFF', () => {
    const config = generateCarePlanFromOnboarding(withAreas(['medications']));
    expect(config.meds.enabled).toBe(true);
    expect(config.wellness.enabled).toBe(false); // no longer force-on
    expect(config.water.enabled).toBe(false);    // no longer force-on
    expect(config.meals.enabled).toBe(false);
    expect(config.vitals.enabled).toBe(false);
  });

  // ── Per-bucket "land usable" coherence ────────────────────────────────────
  it('VITALS selected → enabled WITH blood pressure on by default', () => {
    const config = generateCarePlanFromOnboarding(withAreas(['vitals']));
    expect(config.vitals.enabled).toBe(true);
    expect(config.vitals.vitalTypes).toContain('bp');
  });

  it('MEALS selected → enabled WITH standard mealtimes (breakfast/lunch/dinner)', () => {
    const config = generateCarePlanFromOnboarding(withAreas(['meals']));
    expect(config.meals.enabled).toBe(true);
    expect(config.meals.timesOfDay).toEqual(['morning', 'midday', 'evening']);
  });

  it('WELLNESS selected → enabled WITH morning/evening windows', () => {
    const config = generateCarePlanFromOnboarding(withAreas(['wellness']));
    expect(config.wellness.enabled).toBe(true);
    expect(config.wellness.timesOfDay).toEqual(['morning', 'evening']);
  });

  it('HYDRATION selected → water enabled (recommended); water is a choice, not forced', () => {
    const config = generateCarePlanFromOnboarding(withAreas(['hydration']));
    expect(config.water.enabled).toBe(true);
    expect(config.water.priority).toBe('recommended');
  });

  it('MEDS selected → enabled, priority RECOMMENDED not required while medications[] empty', () => {
    const config = generateCarePlanFromOnboarding(withAreas(['medications']));
    expect(config.meds.enabled).toBe(true);
    expect(config.meds.priority).toBe('recommended'); // was 'required' — kills empty-required nag
    expect(config.meds.medications ?? []).toHaveLength(0); // no placeholder med invented
  });

  it('MEDS-ONLY: meals + vitals stay OFF', () => {
    const config = generateCarePlanFromOnboarding(withAreas(['medications']));
    expect(config.meals.enabled).toBe(false);
    expect(config.vitals.enabled).toBe(false);
  });

  // ── Skip / empty → the sane default ───────────────────────────────────────
  it('SKIP / EMPTY careAreas → DEFAULT_CARE_AREAS (meds+vitals+wellness), water + meals OFF', () => {
    const config = generateCarePlanFromOnboarding(baseAnswers); // careAreas: []
    expect(DEFAULT_CARE_AREAS).toEqual(['medications', 'vitals', 'wellness']);
    expect(config.meds.enabled).toBe(true);
    expect(config.meds.priority).toBe('recommended'); // not required
    expect(config.vitals.enabled).toBe(true);
    expect(config.vitals.vitalTypes).toContain('bp');
    expect(config.wellness.enabled).toBe(true);
    expect(config.wellness.timesOfDay).toEqual(['morning', 'evening']);
    expect(config.water.enabled).toBe(false); // water off by default — now a choice
    expect(config.meals.enabled).toBe(false);
  });

  // ── Concern-driven priority (unchanged behavior, kept for other callers) ──
  it("concern areas still elevate priority to 'required'", () => {
    const config = generateCarePlanFromOnboarding({
      ...baseAnswers,
      concerns: ['hydration', 'sleep_patterns'],
    });
    expect(config.water.priority).toBe('required');
    expect(config.sleep.priority).toBe('required');
    expect(config.water.enabled).toBe(true);
    expect(config.sleep.enabled).toBe(true);
  });
});

describe('onboardingToPlan — getCoreQuickLogFromAnswers (unchanged)', () => {
  it('returns exactly 3 items', () => {
    expect(getCoreQuickLogFromAnswers(baseAnswers)).toHaveLength(3);
  });
  it('always includes wellness', () => {
    expect(getCoreQuickLogFromAnswers(baseAnswers)).toContain('wellness');
  });
  it('includes care areas', () => {
    const core = getCoreQuickLogFromAnswers(withAreas(['medications', 'vitals']));
    expect(core).toContain('wellness');
    expect(core).toContain('meds');
    expect(core).toContain('vitals');
  });
});
